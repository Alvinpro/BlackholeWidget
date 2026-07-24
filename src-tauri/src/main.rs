#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod file_ops;
mod tray;

use serde::Serialize;
use tauri::Emitter;

#[derive(Debug, Serialize, Clone)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
}

/// 可用模型列表（与前端 src/models/index.js 保持同步）
pub fn get_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            id: "model-1".to_string(),
            name: "模型1号".to_string(),
        },
        ModelInfo {
            id: "model-2".to_string(),
            name: "模型2号".to_string(),
        },
    ]
}

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

#[tauri::command]
fn get_models_list() -> Vec<ModelInfo> {
    get_models()
}

#[tauri::command]
fn switch_model(app: tauri::AppHandle, model_id: String) -> Result<(), String> {
    // 验证模型是否存在
    let models = get_models();
    if !models.iter().any(|m| m.id == model_id) {
        return Err(format!("未知模型: {}", model_id));
    }

    // 保存到配置
    let mut settings = config::load_settings();
    settings.active_model = model_id.clone();
    config::save_settings(&settings)?;

    // 通知前端切换模型
    app.emit("model-changed", &model_id)
        .map_err(|e| format!("发送事件失败: {}", e))?;

    // 重建托盘菜单以更新选中状态
    tray::rebuild_tray(&app).map_err(|e| format!("重建菜单失败: {}", e))?;

    Ok(())
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
            get_models_list,
            switch_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}