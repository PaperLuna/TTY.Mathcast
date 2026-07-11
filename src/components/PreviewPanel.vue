<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import katex from "katex";
import renderMathInElement from "katex/contrib/auto-render";
import html2canvas from "html2canvas";
import { useProjectStore } from "@/stores/project";
import { buildStageHTML } from "@/utils/renderer";
import { saveVideo } from "@/composables/useConfig";
import type { Beat } from "@/types";

const store = useProjectStore();

const stageRef = ref<HTMLDivElement>();
const previewBoxRef = ref<HTMLDivElement>();
const beatBadge = ref("第 0 / 0 步");
const previewInfo = ref("");
const progressRef = ref<HTMLDivElement>();
const progressBar = ref<HTMLDivElement>();
const renderOverlay = ref<HTMLDivElement>();
const roBg = ref<HTMLDivElement>();
const roPct = ref("0%");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Render the stage at a given beat index */
async function renderStage(upto: number) {
  if (!stageRef.value) return;
  const html = buildStageHTML(upto, store.beats, store.leftImages, store.rightImages, {
    theme: store.theme,
    leftFit: store.leftFit,
    colW: store.colW,
    stepFontSize: store.stepFontSize,
    stepFontFamily: store.stepFontFamily,
    titleFontSize: store.titleFontSize,
    titleFontFamily: store.titleFontFamily,
    stepGap: store.stepGap,
    title: store.title,
    W: store.W,
    H: store.H,
    leftImgOffset: store.leftImgOffset,
    rightImgOffset: store.rightImgOffset,
  });
  stageRef.value.innerHTML = html;
  // Render KaTeX math
  if (renderMathInElement) {
    renderMathInElement(stageRef.value, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
    });
  }
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {}
  }
}

	/** Update the preview scale to fit the preview box */
	function updateScale() {
	  if (!stageRef.value || !previewBoxRef.value) return;
	  const sw = previewBoxRef.value.clientWidth;
	  const sh = previewBoxRef.value.clientHeight;
	  if (!sw || !sh) return;
	  // Use 0.95 to leave breathing room around the stage
	  const scale = Math.min(sw / store.W, sh / store.H) * 0.95;
	  stageRef.value.style.transform = `translate(-50%,-50%) scale(${scale})`;
	}

/** Update the preview (badge + stage) */
async function updatePreview() {
  if (store.beats.length === 0) store.current = -1;
  if (store.current >= store.beats.length) store.current = store.beats.length - 1;

  beatBadge.value = `第 ${store.current + 1} / ${store.beats.length} 步`;
  previewInfo.value = store.beats.length
    ? `当前步时长 ${store.beats[store.current]?.duration ?? 0}s`
    : "";

  if (store.current >= 0) await renderStage(store.current);
  updateScale();
}

/** Apply column widths without rebuilding DOM (smooth dragging) */
function applyColWidths() {
  if (!stageRef.value) return;
  const g = stageRef.value.querySelector(".stage-grid") as HTMLElement;
  if (g) {
    g.style.gridTemplateColumns = `${store.colW[0]}fr ${store.colW[1]}fr ${store.colW[2]}fr`;
  }
}

/** Reflow: move center lines to right column if overflow, and vice versa */
async function reflowToFit() {
  if (!store.beats.length || !stageRef.value) return;
  const prevCurrent = store.current;
  store.current = store.beats.length - 1;
  await renderStage(store.current);

  const centerCol = stageRef.value.querySelector(".col-center .steps") as HTMLElement;
  const rightCol = stageRef.value.querySelector(".col-right .steps") as HTMLElement;
  if (!centerCol) {
    store.current = prevCurrent;
    return;
  }

  const maxMoves = store.beats.length;

  // Center overflow → move the newest center line to right, one by one
  let guard = 0;
  while (centerCol.scrollHeight > centerCol.clientHeight + 2 && guard < maxMoves) {
    let lastCenter = -1;
    for (let i = store.beats.length - 1; i >= 0; i--) {
      if (store.beats[i].type === "center") {
        lastCenter = i;
        break;
      }
    }
    if (lastCenter < 0) break;
    store.beats[lastCenter].type = "right";
    await renderStage(store.current);
    guard++;
  }

  // Right overflow → move the oldest right line back to center if there is room.
  // This keeps the reading order natural (center top→bottom, then right top→bottom).
  if (rightCol) {
    guard = 0;
    while (rightCol.scrollHeight > rightCol.clientHeight + 2 && guard < maxMoves) {
      let firstRight = -1;
      for (let i = 0; i < store.beats.length; i++) {
        if (store.beats[i].type === "right") {
          firstRight = i;
          break;
        }
      }
      if (firstRight < 0) break;
      store.beats[firstRight].type = "center";
      await renderStage(store.current);
      if (centerCol.scrollHeight > centerCol.clientHeight + 2) {
        // Can't fit in center either: restore and stop
        store.beats[firstRight].type = "right";
        await renderStage(store.current);
        break;
      }
      guard++;
    }
  }

  store.current = prevCurrent;
  await renderStage(store.current);
  store.autosave();
}

// ── Column width sliders ───────────────────────────────
function onSlider(idx: number, e: Event) {
  const val = +(e.target as HTMLInputElement).value;
  store.colW[idx] = val;
  // Right column fills the remainder: 100 - left - center
  store.colW[2] = Math.max(5, 100 - store.colW[0] - store.colW[1]);
  applyColWidths();
  store.markDirty();
}

// ── Image offset sliders ────────────────────────────────
function onImgOffset(side: "left" | "right", e: Event) {
  const val = +(e.target as HTMLInputElement).value;
  if (side === "left") store.leftImgOffset = val;
  else store.rightImgOffset = val;
  // Re-render to apply offset
  if (store.current >= 0) renderStage(store.current);
  store.autosave();
}

// ── Preview playback ───────────────────────────────────
async function playPreview() {
  if (!store.beats.length || store.playing) return;
  store.playing = true;
  for (let i = 0; i < store.beats.length; i++) {
    if (!store.playing) break;
    store.current = i;
    await updatePreview();
    await sleep(store.beats[i].duration * 1000);
  }
  store.playing = false;
}

// ── Video export ───────────────────────────────────────
async function exportVideo() {
  if (!store.beats.length) {
    alert("请先生成时间轴");
    return;
  }
  if (typeof html2canvas === "undefined") {
    alert("html2canvas 未加载");
    return;
  }

  store.exporting = true;
  store.cancelFlag = false;

  // Hide UI elements that should not appear in video frames
  const badgeEl = stageRef.value?.parentElement?.querySelector(".beat-badge") as HTMLElement | null;
  const prevBadgeDisplay = badgeEl?.style.display ?? "";
  const prevStageShadow = stageRef.value?.style.boxShadow ?? "";
  if (badgeEl) badgeEl.style.display = "none";
  if (stageRef.value) stageRef.value.style.boxShadow = "none";

  // Freeze current frame as overlay background
  let frozen: string | null = null;
  try {
    if (stageRef.value) {
      const p0 = stageRef.value.style.transform;
      stageRef.value.style.transform = "none";
      const cap = await html2canvas(stageRef.value, {
        width: store.W,
        height: store.H,
        windowWidth: store.W,
        windowHeight: store.H,
        backgroundColor: null,
        scale: 1,
      });
      stageRef.value.style.transform = p0;
      frozen = cap.toDataURL("image/png");
    }
  } catch {}

  if (roBg.value) roBg.value.style.backgroundImage = frozen ? `url('${frozen}')` : "none";
  roPct.value = "0%";
  renderOverlay.value?.classList.add("show");

  const canvas = document.createElement("canvas");
  canvas.width = store.W;
  canvas.height = store.H;
  const ctx = canvas.getContext("2d")!;
  const types = [
    "video/mp4;codecs=avc1",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const mime =
    types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) ||
    "video/webm";
  const stream = canvas.captureStream(30);
  const chunks: Blob[] = [];
  const rec = new MediaRecorder(stream, { mimeType: mime });
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const done = new Promise<void>((res) => {
    rec.onstop = () => res();
  });
  rec.start();

  const showProgress = progressRef.value && progressBar.value;
  if (showProgress) progressRef.value!.style.display = "block";

  for (let i = 0; i < store.beats.length; i++) {
    if (store.cancelFlag) break;
    store.current = i;
    await updatePreview();
    if (!stageRef.value) continue;
    const prev = stageRef.value.style.transform;
    stageRef.value.style.transform = "none";
    const snap = await html2canvas(stageRef.value, {
      width: store.W,
      height: store.H,
      windowWidth: store.W,
      windowHeight: store.H,
      backgroundColor: null,
      scale: 1,
    });
    stageRef.value.style.transform = prev;
    const end = performance.now() + store.beats[i].duration * 1000;
    while (performance.now() < end) {
      if (store.cancelFlag) break;
      ctx.drawImage(snap, 0, 0);
      if (progressBar.value) {
        progressBar.value.style.width =
          ((i + (1 - (end - performance.now()) / Math.max(1, store.beats[i].duration * 1000))) /
            store.beats.length) *
            100 +
          "%";
      }
      roPct.value = Math.round(((i + 1) / store.beats.length) * 100) + "%";
      await sleep(33);
    }
  }

  rec.stop();
  await done;

  const cancelled = store.cancelFlag;

  if (!cancelled) {
    if (progressBar.value) progressBar.value.style.width = "100%";
    const blob = new Blob(chunks, { type: mime });

    // Use Tauri save dialog instead of <a download>
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    await saveVideo(bytes, `mathcast_video.${ext}`);
  }

  if (progressRef.value) progressRef.value.style.display = "none";
  if (progressBar.value) progressBar.value.style.width = "0";
  renderOverlay.value?.classList.remove("show");

  // Restore hidden UI elements
  if (badgeEl) badgeEl.style.display = prevBadgeDisplay;
  if (stageRef.value) stageRef.value.style.boxShadow = prevStageShadow;

  store.exporting = false;
  store.cancelFlag = false;
  store.current = store.beats.length - 1;
  await updatePreview();
}

// ── Lifecycle ──────────────────────────────────────────
const onResize = () => updateScale();
onMounted(() => {
  window.addEventListener("resize", onResize);
  nextTick(() => updateScale());
});
onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

// Watch for external changes
watch(
  () => store.current,
  () => updatePreview()
);

// Expose to parent via defineExpose
defineExpose({ playPreview, exportVideo, updatePreview, reflowToFit, updateScale });
</script>

<template>
  <div class="col-mid">
    <div class="preview-wrap">
      <div class="preview-tools">
        <span class="tool-label">实时预览</span>
        <div class="col-sliders">
          <span>左</span>
          <input type="range" min="8" max="50" :value="store.colW[0]" @input="onSlider(0, $event)" />
          <span>中</span>
          <input type="range" min="20" max="72" :value="store.colW[1]" @input="onSlider(1, $event)" />
          <span class="sep">|</span>
          <span>左图位</span>
          <input type="range" min="0" max="100" :value="store.leftImgOffset" @input="onImgOffset('left', $event)" />
          <span>右图位</span>
          <input type="range" min="0" max="100" :value="store.rightImgOffset" @input="onImgOffset('right', $event)" />
        </div>
        <span class="preview-info">{{ previewInfo }}</span>
      </div>

      <div class="progress-bar-wrap" ref="progressRef">
        <div class="progress-bar-fill" ref="progressBar"></div>
      </div>

      <div class="preview-box" ref="previewBoxRef">
        <div class="beat-badge">{{ beatBadge }}</div>
        <div
          id="stage"
          ref="stageRef"
          :style="{
            width: store.W + 'px',
            height: store.H + 'px',
          }"
        ></div>
        <div id="renderOverlay" ref="renderOverlay">
          <div class="ro-bg" ref="roBg"></div>
          <div class="ro-fg">
            <span class="spinner"></span>
            <div class="ro-title">正在渲染视频…</div>
            <div class="ro-pct">{{ roPct }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.col-mid {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg);
}

.preview-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 16px 16px;
  gap: 10px;
}

.preview-tools {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 10px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
}

.preview-tools .tool-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.col-sliders {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: center;
}

.col-sliders span {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.col-sliders .sep {
  font-size: 13px;
  color: var(--line);
  margin: 0 2px;
}

.col-sliders input[type="range"] {
  width: 100px;
  accent-color: var(--accent);
  height: 4px;
}

.preview-info {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  background: var(--panel2);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
}

.preview-box {
  position: relative;
  flex: 1;
  background: repeating-conic-gradient(#eef1f5 0% 25%, #e7ebf0 0% 50%) 50%/28px 28px;
  border: 2px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.03);
}

#stage {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(1);
  transform-origin: center center;
  overflow: hidden;
  box-shadow: 0 2px 40px rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.beat-badge {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 5;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(6px);
  letter-spacing: 0.3px;
}

#renderOverlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.85);
  color: #fff;
  border-radius: var(--radius);
  overflow: hidden;
  backdrop-filter: blur(2px);
}

#renderOverlay.show {
  display: flex;
}

.ro-bg {
  position: absolute;
  inset: 0;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.4;
  filter: blur(2px) saturate(0.7);
}

.ro-fg {
  position: relative;
  z-index: 1;
  text-align: center;
}

.ro-fg .spinner {
  width: 30px;
  height: 30px;
  border-width: 3px;
  display: block;
  margin: 0 auto 14px;
}

.ro-fg .ro-title {
  font-size: 16px;
  font-weight: 600;
}

.ro-fg .ro-pct {
  font-size: 13px;
  opacity: 0.85;
  margin-top: 6px;
}

/* Progress bar — top-center position */
.progress-bar-wrap {
  display: none;
  height: 8px;
  background: var(--panel2);
  border-radius: 10px;
  overflow: hidden;
  margin: 0 4px;
  flex-shrink: 0;
}

.progress-bar-fill {
  display: block;
  height: 100%;
  width: 0;
  border-radius: 10px;
  background: linear-gradient(90deg, var(--accent), #555, var(--accent2));
  background-size: 200% 100%;
  animation: progress-shimmer 1.5s linear infinite;
  transition: width 0.2s ease;
}

@keyframes progress-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: 0 0; }
}
</style>
