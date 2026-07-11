<script setup lang="ts">
import { ref, watch } from "vue";
import { useProjectStore } from "@/stores/project";
import { FONTS, FONT_VAL, THEMES } from "@/utils/constants";

const store = useProjectStore();

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "change"): void;
}>();

const fontEntries = Object.entries(FONTS);
const themeEntries = Object.entries(THEMES);

// Local draft state — only written to store on Apply
const draft = ref({
  theme: store.theme,
  stepFontSize: store.stepFontSize,
  stepFontFamily: store.stepFontFamily,
  stepGap: store.stepGap,
  titleFontSize: store.titleFontSize,
  titleFontFamily: store.titleFontFamily,
});

/** Copy current store values into draft when modal opens */
function loadDraft() {
  draft.value = {
    theme: store.theme,
    stepFontSize: store.stepFontSize,
    stepFontFamily: store.stepFontFamily,
    stepGap: store.stepGap,
    titleFontSize: store.titleFontSize,
    titleFontFamily: store.titleFontFamily,
  };
}

watch(() => props.show, (show) => {
  if (show) loadDraft();
});

function selectTheme(key: string) {
  draft.value.theme = key;
}

function clampStepSize(v: number) {
  return Math.max(8, Math.min(64, v || 33));
}

function clampTitleSize(v: number) {
  return Math.max(8, Math.min(90, v || 38));
}

function clampGap(v: number) {
  return Math.max(0, Math.min(60, v || 0));
}

/** Apply draft to store, trigger re-render, then close */
function apply() {
  store.theme = draft.value.theme;
  store.stepFontSize = clampStepSize(draft.value.stepFontSize);
  store.stepFontFamily = draft.value.stepFontFamily;
  store.stepGap = clampGap(draft.value.stepGap);
  store.titleFontSize = clampTitleSize(draft.value.titleFontSize);
  store.titleFontFamily = draft.value.titleFontFamily;
  store.autosave();
  emit("change");
  emit("close");
}

function cancel() {
  emit("close");
}

function onMaskClick(e: MouseEvent) {
  if (e.target === e.currentTarget) cancel();
}
</script>

<template>
  <div
    class="modal-mask"
    :class="{ show: props.show }"
    @click="onMaskClick"
  >
    <div class="modal-card">
      <div class="modal-head">
        <span>设置</span>
        <button class="mini" @click="cancel">✕</button>
      </div>

      <div class="modal-body">
        <!-- Theme -->
        <div class="modal-sec">
          <label>主题</label>
          <div class="theme-row">
            <div
              v-for="[key, t] in themeEntries"
              :key="key"
              class="swatch"
              :class="{ active: key === draft.theme }"
              :style="{ background: t.bg }"
              @click="selectTheme(key)"
            >
              <span class="name" :style="{ color: t.text }">{{ t.label }}</span>
            </div>
          </div>
        </div>

        <!-- Step text -->
        <div class="modal-sec">
          <label>步骤文本</label>
          <div class="row2c">
            <input type="number" v-model.number="draft.stepFontSize" min="14" max="64" />
            <select v-model="draft.stepFontFamily">
              <option v-for="[k, v] in fontEntries" :key="k" :value="FONT_VAL[k]">{{ v }}</option>
            </select>
          </div>
        </div>

        <!-- Step gap -->
        <div class="modal-sec">
          <label>步骤行间距 (px)</label>
          <input type="number" v-model.number="draft.stepGap" min="0" max="60" />
        </div>

        <!-- Title text -->
        <div class="modal-sec">
          <label>标题文本</label>
          <div class="row2c">
            <input type="number" v-model.number="draft.titleFontSize" min="14" max="90" />
            <select v-model="draft.titleFontFamily">
              <option v-for="[k, v] in fontEntries" :key="k" :value="FONT_VAL[k]">{{ v }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="modal-foot">
        <button class="secondary" @click="cancel">取消</button>
        <button class="solid" @click="apply">应用</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-mask.show {
  display: flex;
}

.modal-card {
  width: 440px;
  max-width: 92vw;
  background: var(--panel);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-head {
  padding: 16px 20px;
  font-weight: 700;
  font-size: 15px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-body {
  padding: 18px 20px;
  max-height: 70vh;
  overflow: auto;
}

.modal-sec {
  margin-bottom: 18px;
}

.modal-sec label {
  margin-bottom: 6px;
}

.modal-sec select,
.modal-sec input[type="number"] {
  width: 100%;
}

.theme-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.swatch {
  position: relative;
  width: 64px;
  height: 46px;
  border-radius: 10px;
  border: 2px solid var(--line);
  cursor: pointer;
  overflow: hidden;
}

.swatch.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.25);
}

.swatch .name {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  font-size: 10px;
  text-align: center;
  padding: 2px;
  background: rgba(255, 255, 255, 0.8);
  color: #222;
}

.modal-foot {
  padding: 12px 20px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
