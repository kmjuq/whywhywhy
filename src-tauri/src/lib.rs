use tauri::{
    menu::{MenuBuilder, MenuItem},
    tray::TrayIconBuilder,
    Manager, AppHandle, Emitter,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            println!("Setting up tray icon...");
            
            // 创建托盘菜单
            let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            
            let menu = MenuBuilder::new(app)
                .item(&settings_item)
                .separator()
                .item(&quit_item)
                .build()?;
            
            println!("Menu created successfully");
            
            // 创建托盘图标并设置菜单
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app: &AppHandle, event| {
                    println!("Menu event received: {:?}", event.id);
                    match event.id.as_ref() {
                        "settings" => {
                            println!("Settings menu clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = app.emit("show-settings", ());
                            }
                        }
                        "quit" => {
                            println!("Quit menu clicked");
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;
            
            println!("Tray icon created with menu");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}