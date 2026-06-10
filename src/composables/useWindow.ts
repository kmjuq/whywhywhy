import { ref } from "vue";
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";

export function useWindow() {
  const appWindow = getCurrentWindow();
  const isVisible = ref(false);
  let unlistenBlur: (() => void) | null = null;

  const showWindow = async () => {
    try {
      await appWindow.show();
      await appWindow.setFocus();
      isVisible.value = true;
      
      unlistenBlur = await listen("tauri://blur", async () => {
        setTimeout(async () => {
          const focused = await appWindow.isFocused();
          if (!focused) {
            await hideWindow();
          }
        }, 100);
      });
      
      console.log("[Window] Window shown");
    } catch (error) {
      console.error("[Window] Error showing window:", error);
    }
  };

  const hideWindow = async () => {
    try {
      if (unlistenBlur) {
        unlistenBlur();
        unlistenBlur = null;
      }
      await appWindow.hide();
      isVisible.value = false;
      console.log("[Window] Window hidden");
    } catch (error) {
      console.error("[Window] Error hiding window:", error);
    }
  };

  const toggleWindow = async () => {
    if (isVisible.value) {
      await hideWindow();
    } else {
      await showWindow();
    }
  };

  const setPosition = async (x: number, y: number) => {
    try {
      await appWindow.setPosition(new PhysicalPosition(x, y));
    } catch (error) {
      console.error("[Window] Error setting position:", error);
    }
  };

  const resizeToContent = async (contentHeight: number) => {
    try {
      const minHeight = 300;
      const maxHeight = 700;
      const headerHeight = 48;
      const padding = 24;
      
      const calculatedHeight = contentHeight + headerHeight + padding;
      const finalHeight = Math.min(Math.max(calculatedHeight, minHeight), maxHeight);
      
      await appWindow.setSize(new PhysicalSize(420, Math.round(finalHeight)));
      console.log("[Window] Resized to:", finalHeight);
    } catch (error) {
      console.error("[Window] Error resizing:", error);
    }
  };

  return {
    isVisible,
    showWindow,
    hideWindow,
    toggleWindow,
    setPosition,
    resizeToContent,
    appWindow,
  };
}