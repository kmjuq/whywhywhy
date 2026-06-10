# 智能文本分析工具 - 技术方案文档

## 1. 项目概述

本项目是一款基于 Tauri + Vue3 的跨平台桌面小工具，核心功能是通过划词/划段落捕获文本，自动生成问题标签并调用大模型获取简洁回答，帮助用户快速了解陌生知识点。

**核心特性：**
- 系统托盘驻留，不占用桌面空间
- 支持 macOS、Windows、Linux 多平台
- 基于大模型的智能问题生成
- 简洁回答，快速扫盲

---

## 2. 技术栈

### 2.1 框架选择

| 框架 | 版本 | 选择理由 |
|-----|------|---------|
| Tauri | 2.x | 轻量级跨平台框架，性能优异，资源占用低 |
| Vue | 3+ | 组合式 API，简洁语法，良好的开发体验 |
| TypeScript | 5+ | 类型安全，提升代码质量 |

### 2.2 前端技术
| 分类 | 技术 | 版本 | 说明 |
|-----|------|-----|-----|
| 框架 | Vue | 3+ | UI 构建 |
| 语言 | TypeScript | 5+ | 类型安全 |
| 构建工具 | Vite | 6+ | 快速构建 |
| 样式 | TailwindCSS | 3+ | 快速样式开发 |
| 状态管理 | Pinia | 2+ | 轻量级状态管理 |
| 图标 | Lucide Vue | 最新 | 图标库 |
| HTTP 客户端 | Axios | 1+ | API 调用 |

### 2.3 后端/原生能力
| 分类 | 技术 | 说明 |
|-----|------|-----|
| 框架 | Rust | Tauri 后端逻辑 |
| 托盘 | @tauri-apps/plugin-tray | 系统托盘 |
| 剪贴板 | @tauri-apps/plugin-clipboard | 剪贴板操作 |
| 快捷键 | @tauri-apps/plugin-global-shortcut | 全局快捷键 |
| 文件系统 | @tauri-apps/plugin-fs | 文件读写 |

---

## 3. 架构设计

### 3.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     系统架构                                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐               │
│  │   系统托盘       │    │   全局快捷键     │               │
│  │  (Tray Plugin)  │    │ (Shortcut Plugin)│               │
│  └────────┬────────┘    └────────┬────────┘               │
│           │                      │                         │
│           └──────────┬───────────┘                         │
│                      ▼                                     │
│  ┌───────────────────────────────────────┐                 │
│  │           Vue3 前端应用                │                 │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │                 │
│  │  │ MiniPopup│ │ Settings│ │ History │  │                 │
│  │  │ 主弹窗   │ │ 设置面板 │ │ 历史记录 │  │                 │
│  │  └────┬────┘ └────┬────┘ └────┬────┘  │                 │
│  │       │           │           │        │                 │
│  │       ▼           ▼           ▼        │                 │
│  │  ┌─────────────────────────────────┐   │                 │
│  │  │          Pinia Store            │   │                 │
│  │  │  (状态管理：文本、问题、答案)    │   │                 │
│  │  └───────────────┬─────────────────┘   │                 │
│  └───────────────────┼─────────────────────┘                 │
│                      ▼                                     │
│  ┌───────────────────────────────────────┐                 │
│  │              LLM API                  │                 │
│  │  (LiteLLM / OpenAI SDK)               │                 │
│  └───────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 模块划分

| 模块 | 职责 | 文件位置 |
|-----|------|---------|
| components | UI 组件 | src/components/ |
| composables | 组合式函数 | src/composables/ |
| stores | 状态管理 | src/stores/ |
| utils | 工具函数 | src/utils/ |
| api | API 封装 | src/api/ |

---

## 4. 项目结构

```
smart-text-analyzer/
├── src/
│   ├── components/             # UI 组件
│   │   ├── MiniPopup.vue       # 主弹窗组件
│   │   ├── QuestionList.vue    # 问题列表组件
│   │   ├── QuestionInput.vue   # 问题输入组件
│   │   ├── AnswerPanel.vue     # 答案展示组件
│   │   ├── HistoryPanel.vue    # 历史记录面板
│   │   └── SettingsPanel.vue   # 设置面板
│   ├── composables/            # 组合式函数
│   │   ├── useClipboard.ts     # 剪贴板操作
│   │   ├── useLLM.ts           # 大模型调用
│   │   └── useSettings.ts      # 设置管理
│   ├── stores/                 # Pinia 状态管理
│   │   └── appStore.ts         # 应用状态
│   ├── utils/                  # 工具函数
│   │   └── api.ts              # API 封装
│   ├── App.vue                 # 根组件
│   ├── main.ts                 # 入口文件
│   └── style.css               # 全局样式
├── src-tauri/                  # Tauri 后端
│   ├── src/
│   │   ├── main.rs             # 主入口
│   │   └── tray.rs             # 托盘逻辑
│   └── Cargo.toml              # Rust 依赖
├── public/                     # 静态资源
├── tauri.conf.json             # Tauri 配置
├── vite.config.ts              # Vite 配置
├── package.json                # Node 依赖
└── tsconfig.json               # TypeScript 配置
```

---

## 5. 关键技术实现

### 5.1 系统托盘

```typescript
import { TrayIcon, TrayMenu } from '@tauri-apps/plugin-tray'

const menu = await TrayMenu.new()
await menu.addItem(await TrayMenuItem.new('分析文本', () => openMainWindow()))
await menu.addItem(await TrayMenuItem.new('历史记录', () => openHistory()))
await menu.addSeparator()
await menu.addItem(await TrayMenuItem.new('设置...', () => openSettings()))
await menu.addItem(await TrayMenuItem.new('检查更新', () => checkUpdate()))
await menu.addItem(await TrayMenuItem.new('帮助', () => openHelp()))
await menu.addSeparator()
await menu.addItem(await TrayMenuItem.new('退出', () => appExit()))

await TrayIcon.setMenu(menu)
```

### 5.2 剪贴板监听

```typescript
import { readText, onClipboardChange } from '@tauri-apps/plugin-clipboard'

await onClipboardChange(async () => {
  const text = await readText()
  if (text && text.trim()) {
    store.setCapturedText(text)
    await generateQuestionTags(text)
  }
})
```

### 5.3 大模型调用（LiteLLM）

```typescript
import { ChatCompletion } from 'litellm'

const llm = new ChatCompletion({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
})

// 生成问题标签
const generateQuestionTags = async (text: string): Promise<string[]> => {
  const prompt = `请分析以下文本内容，生成5-8个适合"快速扫盲"的基础问题标签。
  
问题类型应包括：
- 这是什么？（定义、概念）
- 干什么用的？（用途、作用）
- 怎么用？（使用方法）

文本内容：${text}

请以JSON数组格式返回问题标签。`

  const response = await llm.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  })

  return JSON.parse(response.choices[0].message.content)
}
```

---

## 6. Mini 弹窗组件

```vue
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useAppStore } from '../stores/appStore'
import { useClipboard } from '../composables/useClipboard'
import { useLLM } from '../composables/useLLM'
import { RefreshCw, Send, Copy, X } from 'lucide-vue-next'

const store = useAppStore()
const { readText } = useClipboard()
const { tags, answer, isLoading, generateQuestionTags, handleTagClick } = useLLM()

const selectedQuestion = ref('')
const customQuestion = ref('')
const showAnswer = ref(false)

onMounted(async () => {
  const text = await readText()
  if (text) {
    store.setCapturedText(text)
    await generateQuestionTags(text)
  }
})

watch(() => store.capturedText, async (newText) => {
  if (newText) {
    await generateQuestionTags(newText)
    selectedQuestion.value = ''
    customQuestion.value = ''
    showAnswer.value = false
  }
})

const selectQuestion = (question: string) => {
  selectedQuestion.value = question
  customQuestion.value = question
}

const sendQuestion = async () => {
  if (!customQuestion.value || !store.capturedText) return
  showAnswer.value = true
  await handleTagClick(customQuestion.value, store.capturedText)
}
</script>

<template>
  <div class="mini-popup">
    <div class="question-list-area">
      <div class="question-header">
        <span>推荐问题</span>
        <button @click="generateQuestionTags(store.capturedText)" :disabled="isLoading" class="refresh-btn">
          <RefreshCw :size="16" />
        </button>
      </div>
      <div class="question-list">
        <button
          v-for="(tag, index) in tags"
          :key="index"
          @click="selectQuestion(tag)"
          :class="['question-tag', { 'selected': selectedQuestion === tag }]"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <div class="question-edit-area">
      <input
        v-model="customQuestion"
        placeholder="选择或输入问题..."
        class="question-input"
        @keyup.enter="sendQuestion"
      />
      <button @click="sendQuestion" :disabled="!customQuestion || isLoading" class="send-btn">
        <Send :size="16" />
      </button>
    </div>

    <div v-if="showAnswer" class="answer-area">
      <div class="answer-header">
        <span>回答</span>
        <button @click="navigator.clipboard.writeText(answer)" class="copy-btn">
          <Copy :size="14" />
        </button>
        <button @click="showAnswer = false" class="close-btn">
          <X :size="14" />
        </button>
      </div>
      <div class="answer-content">
        <div v-if="isLoading">正在思考...</div>
        <div v-else>{{ answer }}</div>
      </div>
    </div>
  </div>
</template>
```

---

## 7. 开发路线图

| 阶段 | 任务 | 时间估算 |
|-----|------|---------|
| 1 | 项目初始化，配置基础环境 | 1-2天 |
| 2 | 实现系统托盘和窗口管理 | 1-2天 |
| 3 | 实现剪贴板监听和快捷键 | 1-2天 |
| 4 | 集成大模型 API | 2-3天 |
| 5 | 实现主弹窗 UI | 2-3天 |
| 6 | 实现历史记录和设置 | 2-3天 |
| 7 | 测试和打包 | 1-2天 |

---

**文档版本**: v1.0  
**创建日期**: 2026-06-09  
**适用项目**: 智能文本分析工具