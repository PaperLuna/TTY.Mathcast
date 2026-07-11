<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useProjectStore } from "@/stores/project";
import { parseText, insertPageBreaks } from "@/utils/parser";
import TopBar from "@/components/TopBar.vue";
import InputPanel from "@/components/InputPanel.vue";
import PreviewPanel from "@/components/PreviewPanel.vue";
import TimelinePanel from "@/components/TimelinePanel.vue";
import SettingsModal from "@/components/SettingsModal.vue";

const store = useProjectStore();

const showSettings = ref(false);
const previewPanelRef = ref<InstanceType<typeof PreviewPanel>>();

/** Apply changes: parse text → insert page breaks → render */
async function applyChanges() {
  if (!store.dirty || store.applying) return;
  store.setApplying(true);

  const t0 = Date.now();
  const hasTitle = store.title.trim().length > 0;

  // Parse text into beats, then insert page breaks for auto-pagination
  let newBeats = parseText(
    store.steps,
    store.beats,
    hasTitle,
    store.H,
    store.stepFontSize,
    store.stepGap
  );
  newBeats = insertPageBreaks(
    newBeats,
    hasTitle,
    store.H,
    store.stepFontSize,
    store.stepGap
  );

  store.beats.splice(0, store.beats.length, ...newBeats);
  store.current = store.beats.length - 1;

  await previewPanelRef.value?.updatePreview();

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

/** Settings change → re-parse and re-render */
async function onSettingsChange() {
  const hasTitle = store.title.trim().length > 0;
  let newBeats = parseText(
    store.steps, store.beats, hasTitle,
    store.H, store.stepFontSize, store.stepGap
  );
  newBeats = insertPageBreaks(newBeats, hasTitle, store.H, store.stepFontSize, store.stepGap);
  store.beats.splice(0, store.beats.length, ...newBeats);
  await previewPanelRef.value?.updatePreview();
}

/** Handle resolution change */
function handleResolutionChange() {
  nextTick(async () => {
    const hasTitle = store.title.trim().length > 0;
    let newBeats = parseText(
      store.steps, store.beats, hasTitle,
      store.H, store.stepFontSize, store.stepGap
    );
    newBeats = insertPageBreaks(newBeats, hasTitle, store.H, store.stepFontSize, store.stepGap);
    store.beats.splice(0, store.beats.length, ...newBeats);
    await previewPanelRef.value?.updatePreview();
    previewPanelRef.value?.updateScale();
  });
}

// Watch resolution changes
import { watch } from "vue";
watch(() => store.resolution, handleResolutionChange);

/** Initialize: load config or set defaults */
onMounted(async () => {
  const loaded = await store.loadFromConfig();
  if (!loaded) {
    store.steps = ``;
    store.title = "";

    const hasTitle = store.title.trim().length > 0;
    let newBeats = parseText(
      store.steps, [], hasTitle,
      store.H, store.stepFontSize, store.stepGap
    );
    newBeats = insertPageBreaks(newBeats, hasTitle, store.H, store.stepFontSize, store.stepGap);
    store.beats.splice(0, store.beats.length, ...newBeats);
    store.current = store.beats.length - 1;
  }

  await nextTick();
  await previewPanelRef.value?.updatePreview();
  previewPanelRef.value?.updateScale();
  store.clearDirty();
});
</script>

<template>
  <div class="app">
    <TopBar
      @play="handlePlay"
      @export="handleExport"
      @settings="showSettings = true"
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
