# Blackhole Widget

A cute (Q-version) desktop 3D black hole widget — drag files into it to delete them.

![screenshot](public/BlackHoleWidget-Q-version.png)

## Features

- 3D rotating black hole floating on your desktop (Three.js + Fresnel glow shader)
- Drag files onto the black hole to delete them (recycle bin or permanent)
- System tray menu: show/hide, zoom in/out, switch model, auto-start, settings, exit
- Multiple 3D black hole models with hot-switching (purple, gold, ice-blue, and ray-traced lens)
- Right-click drag to rotate the 3D view
- Settings window: confirm before delete, permanent delete toggle
- Window is draggable to reposition

## Requirements

- Windows 10 / 11 (WebView2 built-in)
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.70+

## Quick Start

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run tauri dev

# Production build
npm run tauri build
```

The built executable is at `src-tauri/target/release/blackhole-widget.exe` — run it directly, no installation needed.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri v2 (Rust) |
| 3D rendering | Three.js + GLSL shaders |
| UI | Vue 3 |
| File deletion | `trash` crate (recycle bin) / `std::fs` (permanent) |
| Auto-start | `tauri-plugin-autostart` (Windows registry) |
| Settings persistence | JSON file (`%APPDATA%/blackhole-widget/`) |

## Project Structure

```
BlackholeWidget/
├── src/                     # Vue frontend
│   ├── App.vue              # Main window (Three.js canvas + drag overlay)
│   ├── SettingsApp.vue      # Settings window
│   ├── composables/
│   │   ├── useBlackHole.js  # Three.js scene and animation
│   │   └── useFileDrop.js   # File drag-drop event handling
│   ├── models/              # 3D model definitions
│   │   ├── index.js         # Model registry
│   │   ├── model-1.js       # Model 1 (purple theme)
│   │   ├── model-2.js       # Model 2 (shimmering gold theme)
│   │   ├── model-3.js       # Model 3 (ice-blue theme)
│   │   └── model-4.js       # Model 4 (ray-traced Schwarzschild lens)
│   └── shaders/             # GLSL shaders
├── src-tauri/               # Tauri / Rust backend
│   └── src/
│       ├── main.rs          # Entry point + command registration
│       ├── tray.rs          # System tray + menu
│       ├── config.rs        # Settings I/O
│       └── file_ops.rs      # File deletion logic
├── release.ps1              # One-click release script
└── package.json
```

## Changelog

### v0.1.2

- **Model 3** (new): ice-blue theme — cool white Fresnel glow + ice-blue accretion disk + cyan-blue photon ring + white-to-blue gradient particles
- **Model 4** (new): ray-traced lens black hole — Schwarzschild geodesic ray marching, FBM turbulent accretion disk, Doppler beaming, bloom, renders entirely in a fragment shader
- **Window size persistence**: last window size is saved and restored on next startup
- **Animation fix**: resolved float precision issue causing Model 4 shader time uniform to freeze (switched from `Date.now()` to `performance.now()`)

### v0.1.1

- **Model system**: 3D model code extracted from `useBlackHole.js` into standalone model files (`src/models/`), with support for dynamic hot-switching
- **Model 1** (default): purple Fresnel glow + orange accretion disk + purple photon ring
- **Model 2** (new): shimmering gold theme — goldenrod accretion disk, bright gold outer ring, cream-gold photon ring, 500 gradient gold particles
- **Tray menu "Switch Model"**: right-click tray icon → Switch Model submenu, with checkmark showing the active model, supports runtime switching
- **Model persistence**: last selected model is remembered and restored on next startup
- **Right-click drag to rotate**: hold right mouse button on the widget to rotate the 3D view, auto-rotation resumes on release

### v0.1.0

- Initial release: 3D black hole widget, drag-and-drop file deletion, system tray menu, settings window

## License

MIT

---

# Blackhole Widget

Q版 桌面 3D 黑洞小组件 — 将文件拖入黑洞即可删除。

## 功能

- 3D 旋转黑洞悬浮在桌面上（Three.js + Fresnel 辉光着色器）
- 将文件拖到黑洞上 → 删除到回收站（或永久删除）
- 系统托盘菜单：显示/隐藏、放大/缩小、切换模型、开机启动、设置、退出
- 多种 3D 黑洞模型可热切换（紫色、金色、冰蓝、射线追踪透镜）
- 右键拖拽旋转 3D 视角
- 设置窗口：删除前确认、永久删除开关
- 窗口可拖拽移动位置

## 截图
![screenshot](public/BlackHoleWidget-Q-version.png)

## 环境要求

- Windows 10 / 11（内置 WebView2）
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.70+

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（热更新）
npm run tauri dev

# 生产构建
npm run tauri build
```

构建产物位于 `src-tauri/target/release/blackhole-widget.exe`。

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Tauri v2 (Rust) |
| 3D 渲染 | Three.js + GLSL 着色器 |
| UI | Vue 3 |
| 文件删除 | `trash` crate（回收站）/ `std::fs`（永久） |
| 开机启动 | `tauri-plugin-autostart`（注册表） |
| 设置持久化 | JSON 文件 (`%APPDATA%/blackhole-widget/`) |

## 项目结构

```
BlackholeWidget/
├── src/                     # Vue 前端
│   ├── App.vue              # 主窗口（Three.js 画布 + 拖放叠加层）
│   ├── SettingsApp.vue      # 设置窗口
│   ├── composables/
│   │   ├── useBlackHole.js  # Three.js 场景和动画
│   │   └── useFileDrop.js   # 文件拖放事件处理
│   ├── models/              # 3D 模型定义
│   │   ├── index.js         # 模型注册表
│   │   ├── model-1.js       # 模型1号（紫色主题）
│   │   ├── model-2.js       # 模型2号（闪闪金色主题）
│   │   ├── model-3.js       # 模型3号（冰蓝主题）
│   │   └── model-4.js       # 模型4号（施瓦西射线追踪透镜）
│   └── shaders/             # GLSL 着色器
├── src-tauri/               # Tauri / Rust 后端
│   └── src/
│       ├── main.rs          # 入口 + 命令注册
│       ├── tray.rs          # 系统托盘 + 菜单
│       ├── config.rs        # 设置读写
│       └── file_ops.rs      # 文件删除逻辑
├── release.ps1              # 一键发布脚本
└── package.json
```

## 更新日志

### v0.1.2

- **模型3号**（新增）：冰蓝主题 — 冷白菲涅尔发光 + 冰蓝吸积盘 + 青蓝光子环 + 白→天蓝→深蓝渐变粒子
- **模型4号**（新增）：透镜黑洞 — 施瓦西测地线积分、FBM 湍流吸积盘、Doppler 效应、bloom，全部在片段着色器中渲染
- **窗口大小持久化**：上次窗口大小会被保存，下次启动自动恢复
- **动画修复**：修复浮点精度问题导致模型4号着色器时间 uniform 冻结（`Date.now()` 替换为 `performance.now()`）

### v0.1.1

- **模型系统**：3D 模型代码从 `useBlackHole.js` 抽离为独立模型文件（`src/models/`），支持动态切换
- **模型1号**（默认）：紫色菲涅尔发光 + 橙色吸积盘 + 紫色光子环
- **模型2号**（新增）：闪闪金色主题 — 金菊色吸积盘、亮金外圈、奶油金光子环、500 颗渐变金粒子
- **托盘菜单「切换模型」**：右键托盘图标 → 切换模型子菜单，勾选显示当前模型，支持运行时热切换
- **模型选择持久化**：下次启动自动使用上次选择的模型
- **右键拖拽旋转**：在黑洞窗口上按住右键拖动可 3D 旋转视角，松开后恢复自动旋转

### v0.1.0

- 初始版本：3D 黑洞小组件、拖放文件删除、系统托盘菜单、设置窗口

MIT