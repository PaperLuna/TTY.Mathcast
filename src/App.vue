<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useProjectStore } from "@/stores/project";
import { parseText, insertPageBreaks } from "@/utils/parser";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { confirm } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import TopBar from "@/components/TopBar.vue";
import InputPanel from "@/components/InputPanel.vue";
import PreviewPanel from "@/components/PreviewPanel.vue";
import TimelinePanel from "@/components/TimelinePanel.vue";
import SettingsModal from "@/components/SettingsModal.vue";

const store = useProjectStore();

const showSettings = ref(false);
const previewPanelRef = ref<InstanceType<typeof PreviewPanel>>();

let dragDropUnlisten: (() => void) | null = null;

// ── Helpers ──────────────────────────────────────────────

function hasTitle(): boolean {
  return store.title.trim().length > 0;
}

async function reparseAndRender() {
  const ht = hasTitle();
  // 1) Fast formula-based allocation + page breaks
  let newBeats = parseText(
    store.steps, store.beats, ht,
    store.H, store.stepFontSize, store.stepGap
  );
  newBeats = insertPageBreaks(newBeats, ht, store.H, store.stepFontSize, store.stepGap, store.colW, store.rightImages.length > 0);
  store.beats.splice(0, store.beats.length, ...newBeats);
  store.current = store.beats.length - 1;
  await previewPanelRef.value?.updatePreview();

  // 2) DOM-based sniffing — catches edge cases formulas miss
  await previewPanelRef.value?.sniffAndRebalance();
}

async function refreshPreview() {
  await previewPanelRef.value?.updatePreview();
  previewPanelRef.value?.updateScale();
}

// ── Actions ──────────────────────────────────────────────

/** Apply changes: parse text → insert page breaks → render */
async function applyChanges() {
  if (!store.dirty || store.applying) return;
  store.setApplying(true);

  const t0 = Date.now();
  await reparseAndRender();

  const el = Date.now() - t0;
  if (el < 500) await new Promise((r) => setTimeout(r, 500 - el));

  store.setApplying(false);
  store.clearDirty();
  store.autosave();
}

/** Play preview */
function handlePlay() {
  if (store.playing) {
    store.playing = false;
  } else {
    previewPanelRef.value?.playPreview();
  }
}

/** Export video or cancel */
function handleExport() {
  if (store.exporting) {
    store.cancelFlag = true;
  } else {
    previewPanelRef.value?.exportVideo();
  }
}

/** Called after a project file is loaded — re-render the stage */
async function handleProjectLoaded() {
  await nextTick();
  await refreshPreview();
  await previewPanelRef.value?.sniffAndRebalance();
}

/** Settings change → re-parse and re-render */
async function onSettingsChange() {
  await reparseAndRender();
}

/** Handle resolution change */
function handleResolutionChange() {
  nextTick(async () => {
    await reparseAndRender();
    previewPanelRef.value?.updateScale();
  });
}

/** Check if a JSON object looks like a MathCast project file */
function isMathCastProject(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.beats) ||
    typeof d.theme === "string" ||
    typeof d.steps === "string" ||
    typeof d.title === "string"
  );
}

/** Attempt to import a dropped JSON file as a MathCast project */
async function tryImportProject(filePath: string) {
  // Only handle .json files
  if (!filePath.toLowerCase().endsWith(".json")) return;

  let text: string;
  try {
    text = await readTextFile(filePath);
  } catch {
    // File not readable (permissions, etc.) — silently ignore
    return;
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    // Not valid JSON — silently ignore
    return;
  }

  if (!isMathCastProject(data)) return;

  const fileName = filePath.split(/[\\/]/).pop() || filePath;
  const answer = await confirm(
    `检测到 MathCast 工程文件「${fileName}」，是否导入并开始编辑？`,
    { title: "MathCast", kind: "info" }
  );

  if (!answer) return;

  store.deserialize(data);
  await handleProjectLoaded();
}

// ── Lifecycle ────────────────────────────────────────────

// Watch resolution changes
import { watch } from "vue";
watch(() => store.resolution, handleResolutionChange);

// Watch column width changes (debounced — re-run page breaks on drag-stop)
let colWTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => [...store.colW],
  () => {
    if (colWTimer) clearTimeout(colWTimer);
    colWTimer = setTimeout(async () => {
      if (store.beats.length > 0) {
        const ht = hasTitle();
        const newBeats = insertPageBreaks(
          [...store.beats], ht, store.H, store.stepFontSize, store.stepGap,
          store.colW, store.rightImages.length > 0
        );
        store.beats.splice(0, store.beats.length, ...newBeats);
        await refreshPreview();
        await previewPanelRef.value?.sniffAndRebalance();
      }
    }, 400);
  }
);

onMounted(async () => {
  // Load saved config or start fresh
  const loaded = await store.loadFromConfig();
  if (!loaded) {
    store.steps = "";
    store.title = "";
    await reparseAndRender();
  }

  await nextTick();
  await refreshPreview();
  await previewPanelRef.value?.sniffAndRebalance();
  store.clearDirty();

  // Register drag-drop listener for project file import
  dragDropUnlisten = await getCurrentWindow().onDragDropEvent((event) => {
    if (event.payload.type === "drop") {
      for (const path of event.payload.paths) {
        tryImportProject(path);
      }
    }
  });
});

onUnmounted(() => {
  dragDropUnlisten?.();
});
</script>

<template>
  <div class="app">
    <TopBar
      @play="handlePlay"
      @export="handleExport"
      @settings="showSettings = true"
      @project-loaded="handleProjectLoaded"
    />

    <InputPanel
      @apply="applyChanges"
      @preview-update="previewPanelRef?.updatePreview()"
    />

    <PreviewPanel ref="previewPanelRef" />

    <TimelinePanel
      @preview-update="previewPanelRef?.updatePreview()"
    />

    <SettingsModal
      :show="showSettings"
      @close="showSettings = false"
      @change="onSettingsChange"
    />
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: 340px 1fr 380px;
  grid-template-rows: 56px 1fr;
  height: 100vh;
}
</style>
