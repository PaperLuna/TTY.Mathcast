<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="96" alt="MathCast Logo" />
</p>

<h1 align="center">TTY.MathCast</h1>

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

TTY.MathCast 帮助数学老师 / 内容创作者把**解题步骤文本**自动转化为**讲解视频**：

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

## 使用流程

1. **输入标题和步骤** — 左栏文本框写入 Markdown + LaTeX，点"应用"
2. **检查时间轴** — 右栏自动生成时间轴，可调节每步时长、指定切换图片
3. **预览播放** — 顶栏点"预览播放"，中栏实时展示逐行动画
4. **调整样式** — 点"设置"选择主题、字体、间距、分辨率
5. **导出视频** — 点"导出视频"，等待渲染完成后选择保存路径

> 步骤文本中每行一个步骤；包含 `$$...$$` 或 `\[...\]` 的公式行自动合并为多行块。

## 开发相关

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

## 许可证

[Apache 2.0](LICENSE) (c) TTY.MathCast contributors
