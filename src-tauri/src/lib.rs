mod commands;

use commands::config::ConfigState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize config state — loads or creates the config file
            let config_state = ConfigState::new(app.handle())?;
            app.manage(config_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::config::read_config,
            commands::config::write_config,
            commands::config::save_video,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MathCast application");
}
