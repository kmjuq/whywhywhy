<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { marked } from "marked";
import { listen } from "@tauri-apps/api/event";
import { useClipboard } from "./composables/useClipboard";
import { useLLM } from "./composables/useLLM";
import { useWindow } from "./composables/useWindow";
import { useAppStore } from "./stores/appStore";
import { RefreshCw, Send, Copy, X } from "lucide-vue-next";

const store = useAppStore();
const { startListening } = useClipboard();
const { 
  isLoading, 
  error, 
  generateQuestionTags, 
  queryAnswer, 
  getStoredApiKey,
  setStoredApiKey,
  getStoredModel,
  setStoredModel,
  getStoredProvider,
  setStoredProvider,
  getAvailableProviders,
  getModelsForProvider
} = useLLM();
const { showWindow, isVisible } = useWindow();

const selectedQuestions = ref<string[]>([]);
const customQuestion = ref("");
const showAnswer = ref(false);
const showSettings = ref(false);
const showFullText = ref(false);
const apiKey = ref(getStoredApiKey());
const selectedModel = ref(getStoredModel());
const selectedProvider = ref(getStoredProvider());
const providers = ref(getAvailableProviders());
const availableModels = ref(getModelsForProvider(selectedProvider.value));
const isDev = import.meta.env.DEV;

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

// 自定义代码块渲染器，添加复制功能
const renderer = new marked.Renderer();
renderer.code = function({ text, lang }: { text: string; lang?: string }) {
  const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
  return `
    <div class="code-block-container">
      <div class="code-block-header">
        <span class="code-lang">${lang || 'code'}</span>
        <button 
          class="code-copy-btn" 
          data-code-id="${codeId}"
          onclick="copyCode('${codeId}')"
          title="复制代码"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
      <pre><code id="${codeId}" class="language-${lang}">${text}</code></pre>
    </div>
  `;
};

marked.use({ renderer });

// 渲染 Markdown
const renderedAnswer = computed(() => {
  if (!store.answer) return "";
  return marked.parse(store.answer) as string;
});

// 合并的问题（选中的问题 + 补充文本）
const combinedQuestion = computed(() => {
  const selectedText = selectedQuestions.value.join("；");
  const customText = customQuestion.value.trim();
  
  if (!selectedText && !customText) return "";
  if (!selectedText) return customText;
  if (!customText) return selectedText;
  
  return `${selectedText}；${customText}`;
});

// 初始化剪贴板监听
startListening(async (text) => {
  if (text && isVisible.value) {
    await handleGenerateTags(text);
  }
});

// 监听提供商变化
watch(selectedProvider, (newProvider) => {
  availableModels.value = getModelsForProvider(newProvider);
  selectedModel.value = availableModels.value[0] || "";
});

// 监听捕获文本变化
watch(() => store.capturedText, async (newText) => {
  if (newText && newText.trim() && isVisible.value) {
    await handleGenerateTags(newText);
  }
});

// 处理刷新按钮点击
const handleRefresh = async () => {
  console.log("[DEBUG] handleRefresh clicked");
  console.log("[DEBUG] store.capturedText:", store.capturedText?.substring(0, 50));
  console.log("[DEBUG] store.capturedText length:", store.capturedText?.length);
  console.log("[DEBUG] isLoading:", isLoading.value);
  console.log("[DEBUG] API Key configured:", !!getStoredApiKey());
  
  if (!store.capturedText) {
    console.log("[DEBUG] ERROR: capturedText is empty");
    return;
  }
  
  await handleGenerateTags(store.capturedText);
};

// 生成问题标签
const handleGenerateTags = async (text: string) => {
  console.log("[DEBUG] handleGenerateTags called with text:", text?.substring(0, 30));
  
  if (!text || !text.trim()) {
    console.log("[DEBUG] handleGenerateTags: text is empty");
    return;
  }
  
  selectedQuestions.value = [];
  customQuestion.value = "";
  showAnswer.value = false;
  store.clearAnswer();
  store.clearKnowledgeBackground();
  
  console.log("[DEBUG] Calling generateQuestionTags...");
  const result = await generateQuestionTags(text);
  console.log("[DEBUG] generateQuestionTags result:", result);
};

// 切换问题选择（多选）
const toggleQuestion = (question: string) => {
  const index = selectedQuestions.value.indexOf(question);
  if (index > -1) {
    selectedQuestions.value.splice(index, 1);
  } else {
    selectedQuestions.value.push(question);
  }
};

// 发送问题
const handleSendQuestion = async () => {
  if (!combinedQuestion.value || !store.capturedText) return;
  
  showAnswer.value = true;
  await queryAnswer(store.capturedText, combinedQuestion.value);
};

// 保存设置
const saveSettings = () => {
  setStoredApiKey(apiKey.value);
  setStoredProvider(selectedProvider.value);
  setStoredModel(selectedModel.value);
  showSettings.value = false;
};

// 复制答案
const copyAnswer = async () => {
  if (store.answer) {
    await navigator.clipboard.writeText(store.answer);
  }
};

// 复制代码
const copyCode = (codeId: string) => {
  const codeElement = document.getElementById(codeId);
  if (codeElement) {
    navigator.clipboard.writeText(codeElement.textContent || '');
    // 显示复制成功提示
    const btn = document.querySelector(`[data-code-id="${codeId}"]`);
    if (btn) {
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      setTimeout(() => {
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
      }, 2000);
    }
  }
};

// 挂载时注册全局函数
onMounted(() => {
  (window as any).copyCode = copyCode;
});

// 卸载时移除全局函数
onUnmounted(() => {
  delete (window as any).copyCode;
});

// 显示窗口（用于测试）
onMounted(async () => {
  if (import.meta.env.DEV) {
    await showWindow();
  }
  
  // 监听托盘菜单的设置事件
  const unlisten = await listen('show-settings', () => {
    showSettings.value = true;
  });
  
  // 保存取消监听函数
  onUnmounted(() => {
    unlisten();
  });
});
</script>

<template>
  <div class="window-container">
    <!-- 内容区域 -->
    <div class="content-wrapper">
      <!-- 捕获的文本 -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">捕获文本</span>
          <button 
            @click="showFullText = !showFullText"
            class="section-action"
          >
            {{ showFullText ? '收起' : '展开' }}
          </button>
        </div>
        <div 
          class="section-content"
          :class="showFullText ? 'text-expanded' : 'text-collapsed'"
        >
          {{ store.capturedText || '暂无文本' }}
        </div>
        
        <!-- 调试状态显示 -->
        <div v-if="isDev" class="debug-status">
          <span v-if="!store.capturedText" class="status-error">⚠ 未捕获文本</span>
          <span v-if="!getStoredApiKey()" class="status-error">⚠ 未配置API Key</span>
          <span v-if="isLoading" class="status-info">⏳ 加载中...</span>
        </div>
      </div>

      <!-- 问题列表（多选） -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">推荐问题（可多选）</span>
          <button 
            @click="handleRefresh"
            :disabled="isLoading || !store.capturedText"
            class="section-action-icon"
            title="重新生成"
          >
            <RefreshCw :size="14" :class="{ 'animate-spin': isLoading }" />
          </button>
        </div>

        <div v-if="isLoading && !store.questionTags.length" class="loading-indicator">
          <div class="spinner"></div>
        </div>

        <div v-else-if="store.questionTags.length" class="tag-list">
          <button
            v-for="(tag, index) in store.questionTags"
            :key="index"
            @click="toggleQuestion(tag)"
            :class="[
              'tag',
              selectedQuestions.includes(tag) ? 'tag-selected' : 'tag-default'
            ]"
          >
            {{ tag }}
          </button>
        </div>

        <div v-else class="empty-state">
          复制文本后自动生成
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>

      <!-- 问题输入（文本框 + 补充） -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">问题补充</span>
        </div>
        
        <textarea
          v-model="customQuestion"
          @keyup.enter.exact="handleSendQuestion"
          placeholder="输入补充问题（可选），选中推荐问题会自动发送查询..."
          rows="3"
          class="text-input"
          :disabled="!store.capturedText"
        ></textarea>
      </div>

      <!-- 发送按钮 -->
      <button
        @click="handleSendQuestion"
        :disabled="!combinedQuestion || !store.capturedText || isLoading"
        class="send-button"
      >
        <Send :size="16" />
        发送查询
      </button>

      <!-- 答案展示 -->
      <div v-if="showAnswer" class="section answer-section">
        <div class="section-header">
          <span class="section-title">回答</span>
          <div class="answer-actions">
            <button @click="copyAnswer" class="section-action-icon" title="复制">
              <Copy :size="14" />
            </button>
            <button @click="showAnswer = false" class="section-action-icon" title="关闭">
              <X :size="14" />
            </button>
          </div>
        </div>

        <div v-if="isLoading && !store.answer" class="loading-text">
          <span class="spinner-small"></span>
          思考中...
        </div>

        <div class="answer-content" v-html="renderedAnswer"></div>
        
        <div v-if="isLoading && store.answer" class="loading-indicator-small">
          <span class="spinner-small"></span>
        </div>
      </div>
    </div>

    <!-- 设置弹窗 -->
    <div v-if="showSettings" class="settings-overlay">
      <div class="settings-panel">
        <div class="settings-header">
          <span class="settings-title">设置</span>
          <button @click="showSettings = false" class="close-button">
            <X :size="18" />
          </button>
        </div>
        
        <div class="settings-content">
          <div class="setting-item">
            <label class="setting-label">服务商</label>
            <select
              v-model="selectedProvider"
              class="setting-select"
            >
              <option v-for="provider in providers" :key="provider.id" :value="provider.id">
                {{ provider.name }}
              </option>
            </select>
          </div>
          
          <div class="setting-item">
            <label class="setting-label">API Key</label>
            <input
              v-model="apiKey"
              type="password"
              placeholder="输入 API Key"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">模型</label>
            <select
              v-model="selectedModel"
              class="setting-select"
            >
              <option v-for="model in availableModels" :key="model" :value="model">
                {{ model }}
              </option>
            </select>
          </div>
          
          <button 
            @click="saveSettings"
            class="save-button"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
html, body, #app {
  background: #ffffff !important;
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.window-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  box-sizing: border-box;
}

.section {
  margin-bottom: 12px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.section-action {
  font-size: 11px;
  color: #3b82f6;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  gap: 3px;
}

.section-action:hover {
  background: #eff6ff;
}

.section-action-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  border-radius: 3px;
}

.section-action-icon:hover {
  background: #f3f4f6;
}

.section-action-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.section-content {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
}

.text-collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.text-expanded {
  white-space: pre-wrap;
  word-break: break-word;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1.5px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 6px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.tag-default {
  background: #eff6ff;
  color: #3b82f6;
}

.tag-default:hover {
  background: #dbeafe;
}

.tag-selected {
  background: #3b82f6;
  color: #ffffff;
}

.tag-selected:hover {
  background: #2563eb;
}

.empty-state {
  text-align: center;
  padding: 12px;
  font-size: 12px;
  color: #9ca3af;
}

.error-message {
  margin-top: 8px;
  padding: 8px;
  background: #fef2f2;
  border-radius: 4px;
  font-size: 11px;
  color: #dc2626;
}

.text-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  resize: none;
  box-sizing: border-box;
  font-family: inherit;
}

.text-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.text-input:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.text-input::placeholder {
  color: #9ca3af;
}

.send-button {
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s ease;
}

.send-button:hover:not(:disabled) {
  background: #2563eb;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.answer-section {
  background: #f9fafb;
  border-color: #e5e7eb;
}

.answer-actions {
  display: flex;
  gap: 4px;
}

.loading-text {
  font-size: 12px;
  color: #6b7280;
  padding: 8px 0;
}

.answer-content {
  font-size: 12px;
  color: #374151;
  line-height: 1.6;
}

.settings-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.settings-panel {
  width: 320px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.settings-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.close-button {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  border-radius: 4px;
}

.close-button:hover {
  background: #f3f4f6;
}

.settings-content {
  padding: 16px;
}

.setting-item {
  margin-bottom: 14px;
}

.setting-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.setting-select,
.setting-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  box-sizing: border-box;
}

.setting-select:focus,
.setting-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.setting-input::placeholder {
  color: #9ca3af;
}

.save-button {
  width: 100%;
  padding: 9px;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 4px;
}

.save-button:hover {
  background: #2563eb;
}

.answer-content h1,
.answer-content h2,
.answer-content h3,
.answer-content h4,
.answer-content h5,
.answer-content h6 {
  margin: 0.8em 0 0.4em;
  font-weight: 600;
}

.answer-content h1 { font-size: 1.2em; }
.answer-content h2 { font-size: 1.1em; }
.answer-content h3 { font-size: 1em; }

.answer-content p {
  margin: 0.5em 0;
}

.answer-content ul,
.answer-content ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.answer-content li {
  margin: 0.2em 0;
}

.answer-content code {
  background: #f3f4f6;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.answer-content pre {
  background: #1f2937;
  padding: 0;
  border-radius: 4px;
  margin: 0.5em 0;
  overflow-x: auto;
}

.answer-content pre code {
  background: none;
  padding: 0;
  color: #e5e7eb;
}

.code-block-container {
  background: #1f2937;
  border-radius: 4px;
  overflow: hidden;
  margin: 0.5em 0;
}

.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  background: #111827;
  border-bottom: 1px solid #374151;
}

.code-lang {
  font-size: 10px;
  color: #9ca3af;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.code-copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 2px;
  border-radius: 3px;
  transition: all 0.15s ease;
}

.code-copy-btn:hover {
  background: #374151;
  color: #e5e7eb;
}

.loading-indicator-small {
  display: flex;
  justify-content: center;
  padding: 4px 0;
}

.debug-status {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-error {
  font-size: 10px;
  color: #dc2626;
  background: #fef2f2;
  padding: 2px 6px;
  border-radius: 3px;
}

.status-info {
  font-size: 10px;
  color: #2563eb;
  background: #eff6ff;
  padding: 2px 6px;
  border-radius: 3px;
}

.answer-content blockquote {
  border-left: 3px solid #e5e7eb;
  padding-left: 0.8em;
  margin: 0.5em 0;
  color: #6b7280;
}

.answer-content strong {
  font-weight: 600;
}

.answer-content em {
  font-style: italic;
}

.answer-content a {
  color: #3b82f6;
  text-decoration: none;
}

.answer-content a:hover {
  text-decoration: underline;
}
</style>