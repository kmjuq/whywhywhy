import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

export function useShortcut() {
  const SHORTCUT_KEY = "CmdOrCtrl+Shift+A";

  const registerShortcut = async (callback: () => void) => {
    try {
      await register(SHORTCUT_KEY, callback);
    } catch (error) {
      console.error("Failed to register shortcut:", error);
    }
  };

  const unregisterShortcut = async () => {
    try {
      await unregister(SHORTCUT_KEY);
    } catch (error) {
      console.error("Failed to unregister shortcut:", error);
    }
  };

  return {
    registerShortcut,
    unregisterShortcut,
    SHORTCUT_KEY,
  };
}
