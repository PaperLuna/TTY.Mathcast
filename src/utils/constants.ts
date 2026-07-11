import type { Theme } from "@/types";

/// Font display names
export const FONTS: Record<string, string> = {
  sans: "无衬线",
  serif: "衬线",
  hei: "黑体",
  kai: "楷体",
  mono: "等宽",
};

/// Font CSS values
export const FONT_VAL: Record<string, string> = {
  sans: '"PingFang SC","Microsoft YaHei",system-ui,sans-serif',
  serif: '"Songti SC","SimSun","Source Han Serif SC",serif',
  hei: '"Heiti SC","SimHei","Microsoft YaHei",sans-serif',
  kai: '"Kaiti SC","KaiTi","STKaiti",serif',
  mono: '"Consolas","Courier New",monospace',
};

/// Stage themes
export const THEMES: Record<string, Theme> = {
  white: {
    label: "白色",
    bg: "#ffffff",
    text: "#1f2733",
    panel: "#ffffff",
    border: "rgba(15,23,42,0.10)",
    red: "#e11d48",
    accent: "#111111",
    muted: "#64748b",
  },
  warm: {
    label: "暖黄",
    bg: "#fdf6e3",
    text: "#3b2f24",
    panel: "#fffaf0",
    border: "rgba(120,90,50,0.22)",
    red: "#c0392b",
    accent: "#b9770e",
    muted: "#8a7659",
  },
  black: {
    label: "黑色",
    bg: "#0a0a0a",
    text: "#f5f5f5",
    panel: "#1a1a1a",
    border: "rgba(255,255,255,0.12)",
    red: "#ff5470",
    accent: "#5eead4",
    muted: "#9a9a9a",
  },
  green: {
    label: "绿色",
    bg: "#0b2e22",
    text: "#e6f5ee",
    panel: "#143d2e",
    border: "rgba(110,231,183,0.20)",
    red: "#ff6b6b",
    accent: "#6ee7b7",
    muted: "#6fae9a",
  },
  blue: {
    label: "蓝色",
    bg: "#0b1a2e",
    text: "#e6eef8",
    panel: "#13284a",
    border: "rgba(120,160,230,0.22)",
    red: "#ff6b6b",
    accent: "#60a5fa",
    muted: "#7e93b8",
  },
};

/// Resolution presets
export const RESOLUTIONS = [
  { value: "1920x1080", label: "1920×1080" },
  { value: "1280x720", label: "1280×720" },
  { value: "2560x1440", label: "2560×1440" },
];

/// Image fit options
export const FIT_OPTIONS = [
  { value: "contain", label: "适应（完整显示，不裁剪）" },
  { value: "cover", label: "覆盖（裁剪铺满，无留白）" },
  { value: "fill", label: "拉伸（强制填满，可能变形）" },
  { value: "zoom", label: "放大填充（放大后铺满）" },
  { value: "repeat", label: "重复平铺（原尺寸铺满）" },
  { value: "auto", label: "原始大小（居中不缩放）" },
];

/// Default project state
export function createDefaultState() {
  return {
    beats: [],
    leftImages: [],
    rightImages: [],
    theme: "white",
    leftFit: "contain",
    colW: [22, 48, 30],
    leftImgOffset: 50,
    rightImgOffset: 50,
    stepFontSize: 33,
    stepFontFamily: FONT_VAL.sans,
    titleFontSize: 38,
    titleFontFamily: FONT_VAL.sans,
    stepGap: 8,
    title: "",
    steps: "",
    W: 1920,
    H: 1080,
  };
}
