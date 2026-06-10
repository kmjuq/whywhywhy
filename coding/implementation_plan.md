# 智能文本分析工具 - 实现方案

## 1. 功能实现方式概览

| 功能模块 | 实现方式 | 推荐框架/库 |
|---------|---------|-----------|
| 系统托盘 | Tauri 托盘插件 | @tauri-apps/plugin-tray |
| 文本捕获 | 剪贴板监听 + 全局快捷键 | @tauri-apps/plugin-clipboard, @tauri-apps/plugin-global-shortcut |
| 问题标签生成 | 调用大模型 API | LiteLLM / 直接调用 OpenAI API |
| 大模型查询 | 流式 API 调用 | LiteLLM / OpenAI SDK |
| 历史记录 | SQLite 数据库 | sql.js / SQLite3 |
| 设置面板 | JSON 配置文件 | fs 模块 |
| UI 界面 | Vue3 组件 | Vue 3 + TailwindCSS 3 |

---

## 2. 核心功能实现方案

### 2.1 系统托盘

**实现方式：**
- 使用 Tauri 官方托盘插件 `@tauri-apps/plugin-tray`
- 创建右键菜单，包含分析文本、历史记录、设置、检查更新、帮助、退出等选项

**关键代码示例：**
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

---

### 2.2 文本捕获

**实现方式：**
1. **剪贴板监听**：使用 `@tauri-apps/plugin-clipboard` 的 `onClipboardChange` 监听
2. **全局快捷键**：使用 `@tauri-apps/plugin-global-shortcut` 注册快捷键
3. **划词捕获**：通过剪贴板变化自动触发分析

**关键代码示例：**
```typescript
import { readText, onClipboardChange } from '@tauri-apps/plugin-clipboard'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'

// 监听剪贴板变化
await onClipboardChange(async () => {
  const text = await readText()
  if (text && text.trim()) {
    store.setCapturedText(text)
    await generateQuestionTags(text)
  }
})

// 注册全局快捷键
await register('CmdOrCtrl+Shift+A', async () => {
  const text = await readText()
  if (text) {
    openMainWindow()
  }
})
```

---

### 2.3 大模型接入

**推荐方案：LiteLLM**

**选择理由：**
- 支持多种大模型统一 API（OpenAI、Anthropic、Azure、国产模型等）
- 自动处理不同模型的 API 差异
- 支持流式响应
- 简单易用，与 OpenAI API 兼容

**安装：**
```bash
npm install litellm
```

**关键代码示例：**

```typescript
import { ChatCompletion } from 'litellm'

// 配置 API Key
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
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(response.choices[0].message.content)
  return result.tags || []
}

// 流式查询答案
const queryLLM = async (prompt: string, onMessage: (chunk: string) => void) => {
  const stream = await llm.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    stream: true
  })

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || ''
    if (content) {
      onMessage(content)
    }
  }
}
```

**支持的模型：**
| 模型类型 | 模型名称 | 说明 |
|---------|---------|-----|
| OpenAI | gpt-4, gpt-3.5-turbo | 官方模型 |
| Anthropic | claude-3-sonnet, claude-3-opus | 高性能模型 |
| Azure | azure/gpt-4 | Azure 部署 |
| 国产模型 | qwen, glm, yi | 通过兼容 API |

---

### 2.4 历史记录

**实现方式：**
- 使用 SQLite 数据库存储历史记录
- 推荐使用 `sql.js`（纯 JS 实现，无需额外依赖）

**关键代码示例：**
```typescript
import initSqlJs from 'sql.js'

const SQL = await initSqlJs({
  locateFile: file => `https://sql.js.org/dist/${file}`
})

const db = new SQL.Database()

// 创建表
db.run(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    question TEXT,
    answer TEXT,
    tags TEXT,
    timestamp INTEGER
  )
`)

// 插入记录
const insertHistory = (text: string, question: string, answer: string, tags: string[]) => {
  db.run(
    'INSERT INTO history (text, question, answer, tags, timestamp) VALUES (?, ?, ?, ?, ?)',
    [text, question, answer, JSON.stringify(tags), Date.now()]
  )
}

// 查询记录
const getHistory = (page: number = 1, limit: number = 20) => {
  const offset = (page - 1) * limit
  const result = db.exec(
    `SELECT * FROM history ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  )
  return result[0]?.values || []
}
```

---

### 2.5 设置面板

**实现方式：**
- 使用 JSON 文件存储配置
- 使用 Tauri 的 `fs` 模块读写文件

**关键代码示例：**
```typescript
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

interface Settings {
  apiKey: string
  model: string
  theme: 'light' | 'dark'
  notifications: boolean
}

const defaultSettings: Settings = {
  apiKey: '',
  model: 'gpt-4',
  theme: 'light',
  notifications: true
}

const settingsPath = 'settings.json'

// 读取设置
const loadSettings = async (): Promise<Settings> => {
  try {
    const content = await readTextFile(settingsPath)
    return JSON.parse(content)
  } catch {
    return defaultSettings
  }
}

// 保存设置
const saveSettings = async (settings: Settings) => {
  await writeTextFile(settingsPath, JSON.stringify(settings, null, 2))
}
```

---

### 2.6 UI 界面

**实现方式：**
- Vue3 + TypeScript
- TailwindCSS 3 样式
- Lucide Vue 图标

**组件结构：**
```
src/
├── components/
│   ├── MiniPopup.vue      # 主弹窗组件
│   ├── QuestionList.vue   # 问题列表组件
│   ├── QuestionInput.vue  # 问题输入组件
│   ├── AnswerPanel.vue    # 答案展示组件
│   ├── HistoryPanel.vue   # 历史记录面板
│   └── SettingsPanel.vue  # 设置面板
├── composables/
│   ├── useClipboard.ts    # 剪贴板操作
│   ├── useLLM.ts          # 大模型调用
│   └── useSettings.ts     # 设置管理
├── stores/
│   └── appStore.ts        # Pinia 状态管理
└── utils/
    └── api.ts             # API 封装
```

---

## 3. 项目初始化步骤

### 3.1 创建 Tauri 项目
```bash
pnpm create tauri-app@4.6.2 . --template vue-ts
```

### 3.2 安装依赖
```bash
pnpm install
pnpm add tailwindcss @tailwindcss/vite lucide-vue-next pinia @tauri-apps/plugin-clipboard @tauri-apps/plugin-global-shortcut @tauri-apps/plugin-tray @tauri-apps/plugin-fs
```

### 3.3 配置 TailwindCSS
```typescript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()]
})
```

```css
/* src/style.css */
@import "tailwindcss";
```

### 3.4 配置 Tauri 插件
```typescript
// src-tauri/src/main.rs
fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard::init())
    .plugin(tauri_plugin_global_shortcut::init())
    .plugin(tauri_plugin_tray::init())
    .plugin(tauri_plugin_fs::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

---

## 4. 大模型 API 接入方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|-----|------|-----|---------|
| **LiteLLM** | 统一 API，支持多模型，自动重试 | 需要额外依赖 | 支持多种模型切换 |
| **OpenAI SDK** | 官方支持，稳定可靠 | 仅支持 OpenAI 系列 | 只使用 OpenAI 模型 |
| **直接 HTTP 请求** | 轻量，无依赖 | 需要自己处理签名、重试 | 简单场景 |

**推荐选择：LiteLLM**

---

## 5. 部署与打包

### 5.1 开发模式
```bash
pnpm tauri dev
```

### 5.2 生产打包
```bash
pnpm tauri build
```

### 5.3 环境变量配置
创建 `.env` 文件：
```env
OPENAI_API_KEY=your-api-key-here
DEFAULT_MODEL=gpt-4
```

---

**文档版本**: v1.0  
**创建日期**: 2026-06-09  
**适用项目**: 智能文本分析工具