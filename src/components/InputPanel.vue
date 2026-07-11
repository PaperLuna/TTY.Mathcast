<script setup lang="ts">
import { computed } from "vue";
import { useProjectStore } from "@/stores/project";
import { FIT_OPTIONS } from "@/utils/constants";
import { pickImages } from "@/composables/useImagePicker";
import type { StoredImage } from "@/types";

const store = useProjectStore();

const emit = defineEmits<{
  (e: "apply"): void;
  (e: "preview-update"): void;
}>();

const stepsModel = computed({
  get: () => store.steps,
  set: (v: string) => {
    store.steps = v;
    store.markDirty();
  },
});

const titleModel = computed({
  get: () => store.title,
  set: (v: string) => {
    store.title = v;
    store.markDirty();
  },
});

const leftFitModel = computed({
  get: () => store.leftFit,
  set: (v: string) => {
    store.leftFit = v;
    store.autosave();
    emit("preview-update");
  },
});

/** Pick left images via native dialog */
async function handleLeftImages() {
  const imgs = await pickImages();
  if (imgs.length) {
    store.leftImages.push(...imgs);
    store.markDirty();
  }
}

/** Pick right images via native dialog */
async function handleRightImages() {
  const imgs = await pickImages();
  if (imgs.length) {
    store.rightImages.push(...imgs);
    store.markDirty();
  }
}

/** Remove a left image by index */
function removeLeftImage(idx: number) {
  store.leftImages.splice(idx, 1);
  // Fix beat references
  store.beats.forEach((b) => {
    if (b.leftImgIndex === idx) b.leftImgIndex = null;
    else if (b.leftImgIndex != null && b.leftImgIndex > idx) b.leftImgIndex--;
  });
  store.markDirty();
  emit("preview-update");
}

/** Remove a right image by index */
function removeRightImage(idx: number) {
  store.rightImages.splice(idx, 1);
  store.beats.forEach((b) => {
    if (b.rightImgIndex === idx) b.rightImgIndex = null;
    else if (b.rightImgIndex != null && b.rightImgIndex > idx) b.rightImgIndex--;
  });
  store.markDirty();
  emit("preview-update");
}
</script>

<template>
  <div class="col-left">
    <!-- Title -->
    <div class="section">
      <h3>标题</h3>
      <input
          type="text"
          v-model="titleModel"
          style="width: 100%"
      />
    </div>
    <!-- Step input -->
    <div class="section step-sec">
      <h3>① 解题步骤（每行一步）</h3>
      <textarea v-model="stepsModel"/>
    </div>

    <!-- Left images -->
    <div class="section">
      <h3>② 左栏图片</h3>
      <button @click="handleLeftImages" style="width: 100%">选择图片…</button>
      <div style="margin-top: 8px">
        <label>图片缩放/填充方式</label>
        <select v-model="leftFitModel" style="width: 100%">
          <option v-for="f in FIT_OPTIONS" :key="f.value" :value="f.value">
            {{ f.label }}
          </option>
        </select>
      </div>
      <div class="thumb-grid">
        <div
          v-for="(im, idx) in store.leftImages"
          :key="idx"
          class="thumb-wrap"
        >
          <img class="thumb" :src="im.url" />
          <button class="x" @click="removeLeftImage(idx)">×</button>
        </div>
      </div>
    </div>

    <!-- Right images -->
    <div class="section">
      <h3>③ 右栏上图片</h3>
      <button @click="handleRightImages" style="width: 100%">选择图片…</button>
      <div class="thumb-grid">
        <div
          v-for="(im, idx) in store.rightImages"
          :key="idx"
          class="thumb-wrap"
        >
          <img class="thumb" :src="im.url" />
          <button class="x" @click="removeRightImage(idx)">×</button>
        </div>
      </div>
    </div>

    <!-- Apply button -->
    <div class="section">
      <button
        class="solid"
        :disabled="!store.dirty || store.applying"
        :class="{
          ready: store.dirty && !store.applying,
          loading: store.applying,
        }"
        @click="emit('apply')"
        style="width: 100%"
      >
        <span v-if="store.applying" class="spinner"></span>
        {{ store.applying ? "应用中…" : "✓ 应用" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.col-left {
  border-right: 1px solid var(--line);
  overflow-y: auto;
  padding: 14px;
  background: var(--panel);
  display: flex;
  flex-direction: column;
}

.col-left .section.step-sec {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.col-left .section.step-sec h3 {
  flex: 0 0 auto;
}

.col-left .section.step-sec textarea {
  flex: 1;
  min-height: 220px;
  width: 100%;
  resize: vertical;
  line-height: 1.6;
}
</style>
