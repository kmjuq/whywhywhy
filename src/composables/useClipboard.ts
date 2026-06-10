import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { useAppStore } from "../stores/appStore";

export function useClipboard() {
  const store = useAppStore();
  let lastText = "";
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const checkClipboard = async (onTextCaptured?: (text: string) => void) => {
    try {
      const text = await readText();

      if (text && text.trim() && text !== lastText) {
        lastText = text;
        store.setCapturedText(text);
        console.log("[Clipboard] Text captured:", text.substring(0, 50) + (text.length > 50 ? "..." : ""));

        if (onTextCaptured) {
          onTextCaptured(text);
        }
      }
    } catch (error) {
      console.error("[Clipboard] Error:", error);
    }
  };

  const startListening = async (onTextCaptured?: (text: string) => void) => {
    console.log("[Clipboard] Starting clipboard monitoring...");

    // 立即检查一次
    await checkClipboard(onTextCaptured);

    // 每 500ms 检查一次剪贴板
    pollInterval = setInterval(() => {
      checkClipboard(onTextCaptured);
    }, 500);
  };

  const stopListening = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
      console.log("[Clipboard] Monitoring stopped");
    }
  };

  const getCurrentText = async () => {
    return await readText();
  };

  return {
    startListening,
    stopListening,
    getCurrentText,
  };
}
