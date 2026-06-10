import { ref } from "vue";
import { useAppStore } from "../stores/appStore";

const API_KEY_STORAGE = "llm_api_key";
const MODEL_STORAGE = "llm_model";
const API_BASE_STORAGE = "llm_api_base";
const PROVIDER_STORAGE = "llm_provider";

export interface LLMProvider {
  id: string;
  name: string;
  apiBase: string;
  models: string[];
  defaultModel: string;
}

export const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    apiBase: "https://api.deepseek.com/v1",
    models: ["deepseek-v4-flash", "deepseek-v4-pro"],
    defaultModel: "deepseek-v4-flash",
  },
];

const QUESTION_GENERATION_PROMPT = `请分析以下文本内容，完成两个任务：

任务1：总结相关知识背景
- 概括文本的核心内容
- 介绍相关的基本概念和背景知识
- 说明重要的术语和定义

任务2：生成5-8个适合"快速扫盲"的基础问题标签
问题类型应包括（选择适用的）：
- 这是什么？（定义、概念、本质）
- 干什么用的？（用途、作用、功能）
- 怎么用？（使用方法、基本操作）
- 有什么特点？（特性、优势、亮点）
- 和什么相关？（关联概念、相关技术）
- 适用于什么场景？（使用场景、应用领域）
- 有哪些注意事项？（注意事项、常见问题）

要求：
1. 知识背景要简洁明了，帮助理解文本内容
2. 问题要简洁，一般不超过15个字
3. 选择最能帮助快速了解这个内容的问题
4. 以JSON格式返回，包含"background"和"questions"两个字段，questions是字符串数组

文本内容：
`;

const QUESTION_ANSWER_PROMPT = `你是一个知识问答助手，请根据以下文本内容详细回答用户的问题。

要求：
1. 回答要详细、全面，深入解释相关概念
2. 如果问题涉及多个方面，分点进行说明（使用数字或项目符号）
3. 提供具体的例子帮助理解
4. 用通俗易懂的语言解释专业术语
5. 如果文本中没有相关信息，请基于你的知识给出合理回答

文本内容：
`;

export function useLLM() {
  const store = useAppStore();
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  let abortController: AbortController | null = null;

  const cancelCurrentRequest = () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  };

  const getStoredApiKey = (): string => {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  };

  const setStoredApiKey = (key: string) => {
    localStorage.setItem(API_KEY_STORAGE, key);
  };

  const getStoredModel = (): string => {
    return localStorage.getItem(MODEL_STORAGE) || "deepseek-v4-flash";
  };

  const setStoredModel = (model: string) => {
    localStorage.setItem(MODEL_STORAGE, model);
  };

  const getStoredProvider = (): string => {
    return localStorage.getItem(PROVIDER_STORAGE) || "deepseek";
  };

  const setStoredProvider = (provider: string) => {
    localStorage.setItem(PROVIDER_STORAGE, provider);
  };

  const getStoredApiBase = (): string => {
    const customBase = localStorage.getItem(API_BASE_STORAGE);
    if (customBase) return customBase;

    const provider = getStoredProvider();
    const providerConfig = LLM_PROVIDERS.find(p => p.id === provider);
    return providerConfig?.apiBase || LLM_PROVIDERS[0].apiBase;
  };

  const setStoredApiBase = (base: string) => {
    localStorage.setItem(API_BASE_STORAGE, base);
  };

  const getAvailableProviders = () => {
    return LLM_PROVIDERS;
  };

  const getModelsForProvider = (providerId: string) => {
    const provider = LLM_PROVIDERS.find(p => p.id === providerId);
    return provider?.models || [];
  };

  const generateQuestionTags = async (text: string): Promise<string[]> => {
    console.log("[DEBUG LLM] generateQuestionTags called with text length:", text?.length);

    const apiKey = getStoredApiKey();
    if (!apiKey) {
      error.value = "请先在设置中配置 API Key";
      console.log("[DEBUG LLM] Error: API Key not configured");
      return [];
    }

    if (!text || text.trim().length === 0) {
      error.value = "文本内容不能为空";
      console.log("[DEBUG LLM] Error: text is empty");
      return [];
    }

    isLoading.value = true;
    error.value = null;
    console.log("[DEBUG LLM] Starting API request...");

    try {
      const model = getStoredModel();
      const apiBase = getStoredApiBase();
      console.log("[DEBUG LLM] Model:", model, "API Base:", apiBase);

      const response = await fetch(`${apiBase}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: QUESTION_GENERATION_PROMPT + text,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      console.log("[DEBUG LLM] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      console.log("[DEBUG LLM] Response content:", content?.substring(0, 100));

      if (!content) {
        throw new Error("未获取到有效响应");
      }

      // 尝试解析 JSON 对象
      let result: { background: string; questions: string[] } | null = null;
      try {
        // 尝试直接解析
        result = JSON.parse(content);
      } catch {
        // 如果直接解析失败，尝试提取 JSON 对象
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
          } catch {
            // 继续尝试提取数组格式
          }
        }
      }

      // 如果 JSON 对象解析失败，尝试提取数组格式
      if (!result || !result.questions || !Array.isArray(result.questions)) {
        let tags: string[] = [];
        try {
          // 尝试解析为数组
          tags = JSON.parse(content);
        } catch {
          // 尝试提取数组
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              tags = JSON.parse(jsonMatch[0]);
            } catch {
              // 按行分割
              tags = content
                .split("\n")
                .map((line: string) => line.replace(/^[-•\d.。]+/, "").trim())
                .filter((line: string) => line.length > 0 && line.length <= 20);
            }
          }
        }

        if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
          throw new Error("响应格式不正确");
        }

        store.setQuestionTags(tags);
        return tags;
      }

      // 确保问题数组中的每个元素都是字符串
      if (!result.questions.every((q) => typeof q === "string")) {
        throw new Error("响应格式不正确");
      }

      // 保存知识背景和问题标签
      if (result.background) {
        store.setKnowledgeBackground(result.background);
      }
      store.setQuestionTags(result.questions);
      return result.questions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "生成问题失败";
      error.value = errorMessage;
      console.error("[LLM] Error generating questions:", err);
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  const queryAnswer = async (text: string, question: string): Promise<string> => {
    const apiKey = getStoredApiKey();
    if (!apiKey) {
      error.value = "请先在设置中配置 API Key";
      return "";
    }

    if (!text || text.trim().length === 0) {
      error.value = "文本内容不能为空";
      return "";
    }

    if (!question || question.trim().length === 0) {
      error.value = "问题不能为空";
      return "";
    }

    // 取消之前的请求
    cancelCurrentRequest();
    abortController = new AbortController();

    isLoading.value = true;
    error.value = null;
    store.setIsLoading(true);
    store.clearAnswer();

    try {
      const model = getStoredModel();
      const apiBase = getStoredApiBase();
      const knowledgeBackground = store.knowledgeBackground;

      // 构建包含知识背景的请求内容
      let content = QUESTION_ANSWER_PROMPT;
      if (knowledgeBackground) {
        content += `\n知识背景：${knowledgeBackground}\n\n`;
      }
      content += `文本内容：${text}\n\n用户问题：${question}`;

      const response = await fetch(`${apiBase}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: content,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法获取响应流");
      }

      const decoder = new TextDecoder("utf-8");
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith("data:")) continue;

          const dataStr = trimmedLine.slice(5).trim();
          if (dataStr === "[DONE]") continue;

          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              store.setAnswer(fullContent);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      abortController = null;
      return fullContent;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return "";
      }
      const errorMessage = err instanceof Error ? err.message : "获取答案失败";
      error.value = errorMessage;
      console.error("[LLM] Error querying answer:", err);
      return "";
    } finally {
      abortController = null;
      isLoading.value = false;
      store.setIsLoading(false);
    }
  };

  return {
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
    getStoredApiBase,
    setStoredApiBase,
    getAvailableProviders,
    getModelsForProvider,
  };
}
