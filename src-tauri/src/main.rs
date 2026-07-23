#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod file_ops;
mod tray;

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DeleteResult {
    pub deleted: Vec<String>,
    pub errors: Vec<DeleteError>,
}

#[derive(Debug, Serialize)]
pub struct DeleteError {
    pub path: String,
    pub message: String,
}

#[tauri::command]
fn delete_files(paths: Vec<String>) -> DeleteResult {
    let settings = config::load_settings();
    let mut deleted = Vec::new();
    let mut errors = Vec::new();

    for path in paths {
        match file_ops::delete_file(&path, settings.permanent_delete) {
            Ok(()) => deleted.push(path),
            Err(msg) => errors.push(DeleteError { path, message: msg }),
        }
    }

    DeleteResult { deleted, errors }
}

#[tauri::command]
fn get_settings() -> config::Settings {
    config::load_settings()
}

#[tauri::command]
fn save_settings(settings: config::Settings) -> Result<(), String> {
    config::save_settings(&settings)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .setup(|app| {
            tray::create_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            delete_files,
            get_settings,
            save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}