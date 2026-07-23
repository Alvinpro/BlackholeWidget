# Blackhole Widget

桌面 3D 黑洞小组件 — 将文件拖入黑洞即可删除。

## 功能

- 3D 旋转黑洞悬浮在桌面上（Three.js + Fresnel 辉光着色器）
- 将文件拖到黑洞上 → 删除到回收站（或永久删除）
- 系统托盘菜单：显示/隐藏、放大/缩小、开机启动、设置、退出
- 设置窗口：删除前确认、永久删除开关
- 窗口可拖拽移动位置

## 截图

<!-- TODO: 添加截图 -->

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

## 一键发布

```powershell
.\release.ps1
```

脚本自动完成：安装依赖 → 构建 → 提交 Git → 打 tag → 推送到 GitHub → 创建 Release。

首次使用前需要：

1. 安装 [GitHub CLI](https://cli.github.com/) 并登录：
   ```bash
   winget install GitHub.cli
   gh auth login
   ```

2. 在 GitHub 创建仓库，然后添加 remote：
   ```bash
   git remote add origin https://github.com/YOUR_USER/BlackholeWidget.git
   ```

## 项目结构

```
BlackholeWidget/
├── src/                     # Vue 前端
│   ├── App.vue              # 主窗口（Three.js 画布 + 拖放叠加层）
│   ├── SettingsApp.vue      # 设置窗口
│   ├── composables/
│   │   ├── useBlackHole.js  # Three.js 场景和动画
│   │   └── useFileDrop.js   # 文件拖放事件处理
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

## License

MIT