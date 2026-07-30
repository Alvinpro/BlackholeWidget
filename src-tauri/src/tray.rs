use crate::config;
use tauri::{
    image::Image,
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, LogicalSize, Manager, Runtime, WebviewWindowBuilder,
};
use tauri_plugin_autostart::AutoLaunchManager;
use tauri_plugin_dialog::DialogExt;

/// Generate a simple 32x32 black-circle-with-purple-glow icon in memory
fn tray_icon() -> Image<'static> {
    let size = 32usize;
    let mut rgba: Vec<u8> = Vec::with_capacity(size * size * 4);
    let cx = size as f32 / 2.0;
    let cy = size as f32 / 2.0;
    let radius = size as f32 / 2.0 - 2.0;

    for y in 0..size {
        for x in 0..size {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let dist = (dx * dx + dy * dy).sqrt();

            if dist <= radius {
                rgba.extend_from_slice(&[10, 5, 20, 255]);
            } else if dist <= radius + 2.0 {
                let t = (dist - radius) / 2.0;
                let alpha = (255.0 * (1.0 - t)) as u8;
                rgba.extend_from_slice(&[80, 20, 150, alpha]);
            } else {
                rgba.extend_from_slice(&[0, 0, 0, 0]);
            }
        }
    }

    Image::new_owned(rgba, size as u32, size as u32)
}

fn autostart_enabled<R: Runtime>(app: &AppHandle<R>) -> bool {
    app.state::<AutoLaunchManager>()
        .is_enabled()
        .unwrap_or(false)
}

fn active_model_id() -> String {
    config::load_settings().active_model
}

/// Build a submenu for model switching
fn build_model_submenu<R: Runtime>(
    app: &AppHandle<R>,
    active_override: Option<&str>,
) -> tauri::Result<tauri::menu::Submenu<R>> {
    let models = crate::get_models();
    let active_id = active_override.map(|s| s.to_string())
        .unwrap_or_else(|| active_model_id());

    let mut submenu = SubmenuBuilder::new(app, "切换模型");

    for model in &models {
        // 模型X号上方增加分隔线
        if model.id == "model-x" {
            submenu = submenu.separator();
        }
        let is_active = model.id == active_id;
        let id = format!("model:{}", model.id);
        let item = CheckMenuItemBuilder::with_id(&id, &model.name)
            .checked(is_active)
            .build(app)?;
        submenu = submenu.item(&item);
    }

    submenu.build()
}

/// Build a menu for the tray with the given autostart state
fn build_menu<R: Runtime>(
    app: &AppHandle<R>,
    autostart_enabled: bool,
) -> tauri::Result<tauri::menu::Menu<R>> {
    build_menu_inner(app, autostart_enabled, None)
}

/// Build a menu with an overridden active model (用于不持久化 model-x 的托盘勾选)
fn build_menu_inner<R: Runtime>(
    app: &AppHandle<R>,
    autostart_enabled: bool,
    active_override: Option<&str>,
) -> tauri::Result<tauri::menu::Menu<R>> {
    let show_hide = MenuItemBuilder::with_id("show_hide", "显示/隐藏").build(app)?;
    let zoom_in = MenuItemBuilder::with_id("zoom_in", "放大窗口").build(app)?;
    let zoom_out = MenuItemBuilder::with_id("zoom_out", "缩小窗口").build(app)?;
    let autostart = CheckMenuItemBuilder::with_id("autostart", "开机启动")
        .checked(autostart_enabled)
        .build(app)?;
    let settings = MenuItemBuilder::with_id("settings", "设置").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;

    let model_submenu = build_model_submenu(app, active_override)?;

    MenuBuilder::new(app)
        .item(&show_hide)
        .item(&zoom_in)
        .item(&zoom_out)
        .separator()
        .item(&model_submenu)
        .separator()
        .item(&autostart)
        .item(&settings)
        .item(&quit)
        .build()
}

/// Resize the main window by a delta in logical pixels (clamped to min 200)
fn resize_main_window<R: Runtime>(app: &AppHandle<R>, delta: f64) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(current) = window.inner_size() {
            let scale = window.scale_factor().unwrap_or(1.0);
            let logical: LogicalSize<f64> = current.to_logical(scale);
            let w: f64 = logical.width;
            let h: f64 = logical.height;
            let new_w = (w + delta).max(120.0).min(800.0);
            let new_h = (h + delta).max(120.0).min(800.0);
            let _ = window.set_size(LogicalSize::new(new_w, new_h));
            // 持久化窗口大小
            let mut settings = config::load_settings();
            settings.window_width = new_w;
            settings.window_height = new_h;
            let _ = config::save_settings(&settings);
        }
    }
}

pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let icon = tray_icon();

    let menu = build_menu(app, autostart_enabled(app))?;

    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Some(window) = tray.app_handle().get_webview_window("main") {
                    let visible = window.is_visible().unwrap_or(false);
                    if visible {
                        window.hide().ok();
                    } else {
                        window.show().ok();
                        window.set_focus().ok();
                    }
                }
            }
        })
        .on_menu_event(|app, event| {
            let event_id = event.id().as_ref().to_string();
            match event_id.as_str() {
                "show_hide" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let visible = window.is_visible().unwrap_or(false);
                        if visible {
                            window.hide().ok();
                        } else {
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                }
                "zoom_in" => {
                    resize_main_window(app, 40.0);
                }
                "zoom_out" => {
                    resize_main_window(app, -40.0);
                }
                "autostart" => {
                    let manager = app.state::<AutoLaunchManager>();
                    let new_state = !manager.is_enabled().unwrap_or(false);
                    if new_state {
                        manager.enable().ok();
                    } else {
                        manager.disable().ok();
                    }
                    if let Ok(new_menu) = build_menu(app, new_state) {
                        if let Some(tray) = app.tray_by_id("main-tray") {
                            let _ = tray.set_menu(Some(new_menu));
                        }
                    }
                }
                "settings" => {
                    open_settings_window(app);
                }
                "quit" => {
                    app.exit(0);
                }
                id if id.starts_with("model:") => {
                    let model_id = id.strip_prefix("model:").unwrap_or("model-1");
                    handle_model_switch(app, model_id);
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

fn handle_model_switch<R: Runtime>(app: &AppHandle<R>, model_id: &str) {
    // 模型X号：弹出文件对话框选择 .glb 文件，不走常规切换流程
    if model_id == "model-x" {
        let handle = app.clone();
        app.dialog()
            .file()
            .add_filter("GLB 模型", &["glb"])
            .pick_file(move |file_path| {
                if let Some(path) = file_path {
                    let path_str = path.as_path()
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_default();
                    if !path_str.is_empty() {
                        let _ = handle.emit("model-x-file-selected", path_str);
                    }
                }
            });
        return;
    }

    // 验证模型是否存在
    let models = crate::get_models();
    if !models.iter().any(|m| m.id == model_id) {
        return;
    }

    // 保存到配置
    let mut settings = config::load_settings();
    settings.active_model = model_id.to_string();
    if config::save_settings(&settings).is_err() {
        return;
    }

    // 通知前端切换模型
    let _ = app.emit("model-changed", model_id.to_string());

    // 重建托盘菜单以更新选中状态
    if let Ok(new_menu) = build_menu(app, autostart_enabled(app)) {
        if let Some(tray) = app.tray_by_id("main-tray") {
            let _ = tray.set_menu(Some(new_menu));
        }
    }
}

/// 重建托盘菜单（外部调用，如切换模型后更新选中状态）
pub fn rebuild_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let new_menu = build_menu(app, autostart_enabled(app))?;
    if let Some(tray) = app.tray_by_id("main-tray") {
        tray.set_menu(Some(new_menu))?;
    }
    Ok(())
}

/// 重建托盘菜单并指定勾选模型（用于 model-x 等不持久化的模型）
pub fn rebuild_tray_with_active<R: Runtime>(app: &AppHandle<R>, active_id: &str) -> tauri::Result<()> {
    let new_menu = build_menu_inner(app, autostart_enabled(app), Some(active_id))?;
    if let Some(tray) = app.tray_by_id("main-tray") {
        tray.set_menu(Some(new_menu))?;
    }
    Ok(())
}

fn open_settings_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
        return;
    }

    let result = WebviewWindowBuilder::new(
        app,
        "settings",
        tauri::WebviewUrl::App("settings.html".into()),
    )
    .title("Blackhole Widget - 设置")
    .inner_size(380.0, 220.0)
    .resizable(false)
    .decorations(true)
    .build();

    if let Err(e) = result {
        eprintln!("无法创建设置窗口: {}", e);
    }
}
