<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="96" alt="MathCast Logo" />
</p>

<h1 align="center">MathCast</h1>

<p align="center">
  <strong>数学题讲解视频生成器</strong>
  <br />
  写步骤，出视频——LaTeX 公式 + 逐行动画 + 一键导出 MP4
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri&logoColor=white" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/Rust-1.77+-DEA584?logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/platform-Windows-0078D6?logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="Apache 2.0" />
</p>

---

## 这是什么

MathCast 帮助数学老师 / 内容创作者把**解题步骤文本**自动转化为**讲解视频**：

```
输入 Markdown + LaTeX → 自动排版分栏 → 逐行动画播放 → 导出 MP4
```

无需 PowerPoint，无需录屏——写好步骤，一键出片。

## 功能

- **Markdown + LaTeX 步骤输入** — 支持标题、公式、列表、代码块等完整 Markdown 语法，LaTeX 行内 `$...$` 与块级 `$$...$$` / `\[...\]` 公式实时渲染
- **三栏舞台布局** — 左栏（配图）、中栏（主步骤）、右栏（补充推导），列宽可拖拽调节
- **自动换页** — 内容溢出时自动插入换页过渡，无需手动计算屏幕空间
- **逐行动画预览** — 点播放后步骤逐行出现，最新行高亮为红色，旧行自动淡化
- **图片插入** — 支持 PNG / JPG / WebP / GIF / SVG，左栏右栏独立控制，缩放模式可调（适应 / 覆盖 / 拉伸 / 放大 / 平铺）
- **5 套内置主题** — 白色、暖黄、黑色、绿色、蓝色，字体与间距均可自定义
- **多分辨率输出** — 1080p / 720p / 1440p，适配不同平台
- **视频导出** — 使用 Canvas + MediaRecorder 合成 MP4 / WebM，带进度条与实时百分比
- **项目存读** — JSON 格式项目文件，可保存 / 恢复完整工作状态（步骤、图片、主题、时间轴）
- **配置持久化** — Rust 侧文件存储，原子写入，重启不丢配置

## 快速开始

### 前置要求

| 工具 | 最低版本 | 说明 |
|---|---|---|
| [Node.js](https://nodejs.org) | 18+ | 前端运行时 |
| [Rust](https://rustup.rs) | 1.77+ | Tauri 后端编译 |
| [pnpm](https://pnpm.io) | 8+ | 推荐包管理器（兼容 npm / yarn） |

Windows 用户需额外安装 [Microsoft Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（勾选 "C++ 桌面开发" 工作负载）。

### 安装与启动

```bash
# 克隆仓库
git clone https://github.com/your-org/mathcast.git
cd mathcast

# 安装前端依赖
npm install

# 启动开发模式（热重载）
npm run tauri:dev
```

首次启动会自动下载 Tauri Rust 依赖，可能需要几分钟。

### 构建安装包

```bash
npm run tauri:build
```

产物位于 `src-tauri/target/release/bundle/`：
- `.msi` — MSI 安装程序
- `.exe` — NSIS 安装程序（可选中文 / 英文）

安装包内嵌 WebView2 离线运行时，无网络环境也可安装。

## 使用流程

1. **输入标题和步骤** — 左栏文本框写入 Markdown + LaTeX，点"应用"
2. **检查时间轴** — 右栏自动生成时间轴，可调节每步时长、指定切换图片
3. **预览播放** — 顶栏点"预览播放"，中栏实时展示逐行动画
4. **调整样式** — 点"设置"选择主题、字体、间距、分辨率
5. **导出视频** — 点"导出视频"，等待渲染完成后选择保存路径

> 步骤文本中每行一个步骤；包含 `$$...$$` 或 `\[...\]` 的公式行自动合并为多行块。

## 技术架构

```
┌────────────────────────────────────────────────────┐
│                    Vue 3 前端                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ InputPanel│  │PreviewPanel│  │ TimelinePanel   │ │
│  │ 步骤输入  │  │ 画布渲染  │  │ 时间轴 & 图片     │ │
│  └──────────┘  └──────────┘  └──────────────────┘ │
│         │              │               │           │
│         └──────────────┼───────────────┘           │
│                        │                           │
│              ┌─────────▼─────────┐                 │
│              │   Pinia Store     │                 │
│              │   全局状态管理     │                 │
│              └─────────┬─────────┘                 │
├────────────────────────┼───────────────────────────┤
│              Tauri IPC │ (invoke)                  │
├────────────────────────┼───────────────────────────┤
│                   Rust 后端                         │
│  ┌────────────────────▼──────────────────────────┐ │
│  │  read_config / write_config / save_video      │ │
│  │  配置文件读写  ·  视频二进制保存               │ │
│  └───────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────┐ │
│  │  tauri-plugin-dialog  ·  tauri-plugin-fs      │ │
│  │  原生文件对话框  ·  文件系统访问               │ │
│  └───────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### 核心依赖

| 库 | 用途 |
|---|---|
| [KaTeX](https://katex.org) | LaTeX 数学公式渲染 |
| [html2canvas](https://html2canvas.hertzen.com) | DOM → Canvas 截图（视频帧合成） |
| [marked](https://marked.js.org) | Markdown → HTML 解析 |
| [Pinia](https://pinia.vuejs.org) | Vue 3 状态管理 |
| [Tauri 2](https://v2.tauri.app) | 桌面应用框架 |
| [tauri-plugin-dialog](https://github.com/tauri-apps/tauri-plugin-dialog) | 原生文件对话框 |
| [tauri-plugin-fs](https://github.com/tauri-apps/tauri-plugin-fs) | 文件系统访问 |

### 视频合成流程

```
步骤文本
  │
  ▼
parseText()          ← 解析 Markdown → beats 数组
  │
  ▼
insertPageBreaks()   ← 自动换页（列溢出检测）
  │
  ▼
buildStageHTML()     ← 生成舞台 DOM（内联样式 + KaTeX 渲染）
  │
  ▼
html2canvas()        ← DOM 截图（每步一帧）
  │
  ▼
MediaRecorder        ← Canvas 帧合成视频流
  │
  ▼
save_video (Rust)    ← 原生保存对话框 → .mp4 / .webm
```

## 项目结构

```
mathcast/
├── src/                          # Vue 3 前端源码
│   ├── App.vue                   # 根组件（应用布局 & 变更调度）
│   ├── main.ts                   # 入口
│   ├── components/
│   │   ├── TopBar.vue            # 顶栏（播放 / 设置 / 存读项目 / 导出）
│   │   ├── InputPanel.vue        # 左栏（步骤输入 / 图片上传 / 标题）
│   │   ├── PreviewPanel.vue      # 中栏（舞台预览 / 视频导出 / 换页过渡）
│   │   ├── TimelinePanel.vue     # 右栏（时间轴 / 图片切换 / 时长批量设置）
│   │   └── SettingsModal.vue     # 设置弹窗（主题 / 字体 / 间距 / 分辨率）
│   ├── composables/
│   │   ├── useConfig.ts          # 配置文件读写（Tauri IPC → Rust）
│   │   ├── useImagePicker.ts     # 图片选择（原生对话框 + 转 base64）
│   │   └── useProjectFile.ts     # 项目存读（JSON 序列化 + 原生保存）
│   ├── stores/
│   │   └── project.ts            # Pinia Store（beats / 图片 / 主题 / UI 状态）
│   ├── utils/
│   │   ├── constants.ts          # 常量（字体 / 主题 / 分辨率 / 图片缩放模式）
│   │   ├── renderer.ts           # 舞台 HTML 构建（computeState + buildStageHTML）
│   │   └── parser.ts             # 步骤解析（Markdown 预处理 + beats 生成 + 自动换页）
│   ├── types/
│   │   └── index.ts              # TypeScript 类型（Beat / StoredImage / ProjectState 等）
│   └── styles/
│       └── main.css              # 全局样式（CSS 变量 / 按钮 / 布局 / 进度条）
├── src-tauri/                    # Rust 后端
│   ├── Cargo.toml                # Rust 依赖
│   ├── tauri.conf.json           # Tauri 配置（窗口 / 安全策略 / 打包选项）
│   ├── capabilities/
│   │   └── default.json          # 权限声明（dialog / fs / core）
│   ├── icons/                    # 应用图标
│   └── src/
│       ├── main.rs               # Rust 入口
│       ├── lib.rs                # 应用初始化（插件注册 / 命令注册）
│       └── commands/
│           ├── mod.rs
│           └── config.rs         # 配置读写（RwLock 缓存 + 原子写入）
├── index.html                    # HTML 入口
├── package.json
├── vite.config.ts                # Vite 构建配置
├── tsconfig.json
└── tsconfig.node.json
```

## 开发

```bash
# 安装依赖
npm install

# 启动前端开发服务器
npm run dev

# 启动 Tauri 开发模式（前端 + Rust）
npm run tauri:dev

# TypeScript 类型检查
npx tsc --noEmit

# Rust 编译检查
cd src-tauri && cargo check

# 构建生产包
npm run tauri:build
```

> 开发模式下 Vite 监听 `http://localhost:1420`，Tauri WebView 自动连接该地址实现热重载。

## 配置参考

### 分辨率预设

| 预设 | 分辨率 | 宽高比 |
|---|---|---|
| 1080p | 1920 × 1080 | 16:9 |
| 720p | 1280 × 720 | 16:9 |
| 1440p | 2560 × 1440 | 16:9 |

### 图片缩放模式

| 模式 | 效果 |
|---|---|
| 适应 (contain) | 完整显示，不裁剪，留白填背景色 |
| 覆盖 (cover) | 裁剪铺满，无留白 |
| 拉伸 (fill) | 强制填满，可能变形 |
| 放大 (zoom) | 150% 放大后铺满 |
| 平铺 (repeat) | 原尺寸重复平铺 |
| 原始 (auto) | 居中不缩放 |

### 内置主题

| 主题 | 背景 | 文字 | 强调色 |
|---|---|---|---|
| 白色 | `#ffffff` | `#1f2733` | `#0ea5e9` |
| 暖黄 | `#fdf6e3` | `#3b2f24` | `#b9770e` |
| 黑色 | `#0a0a0a` | `#f5f5f5` | `#5eead4` |
| 绿色 | `#0b2e22` | `#e6f5ee` | `#6ee7b7` |
| 蓝色 | `#0b1a2e` | `#e6eef8` | `#60a5fa` |

## License

[Apache 2.0](LICENSE) © MathCast
