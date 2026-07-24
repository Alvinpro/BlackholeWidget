use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub confirm_delete: bool,
    pub permanent_delete: bool,
    #[serde(default = "default_model")]
    pub active_model: String,
    #[serde(default = "default_window_size")]
    pub window_width: f64,
    #[serde(default = "default_window_size")]
    pub window_height: f64,
}

fn default_model() -> String {
    "model-1".to_string()
}

fn default_window_size() -> f64 {
    320.0
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            confirm_delete: true,
            permanent_delete: false,
            active_model: default_model(),
            window_width: default_window_size(),
            window_height: default_window_size(),
        }
    }
}

fn settings_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("blackhole-widget")
        .join("settings.json")
}

pub fn load_settings() -> Settings {
    let path = settings_path();
    if path.exists() {
        fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        let defaults = Settings::default();
        save_settings(&defaults).ok();
        defaults
    }
}

pub fn save_settings(settings: &Settings) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败: {}", e))?;
    }
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("序列化配置失败: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("写入配置失败: {}", e))
}