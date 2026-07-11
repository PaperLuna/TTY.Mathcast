<script setup lang="ts">
import { computed, ref } from "vue";
import { useProjectStore } from "@/stores/project";
import { RESOLUTIONS } from "@/utils/constants";
import { saveProjectFile, loadProjectFile } from "@/composables/useProjectFile";

const store = useProjectStore();

const emit = defineEmits<{
  (e: "play"): void;
  (e: "export"): void;
  (e: "settings"): void;
}>();

const resModel = computed({
  get: () => store.resolution,
  set: (v: string) => store.setResolution(v),
});

const playing = computed(() => store.playing);

/** Notification toast */
const toast = ref<{ message: string; type: "success" | "error" } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string, type: "success" | "error") {
  if (toastTimer) clearTimeout(toastTimer);
  toast.value = { message, type };
  toastTimer = setTimeout(() => {
    toast.value = null;
  }, 3500);
}

/** Save project to a JSON file via native dialog */
async function handleSave() {
  const result = await saveProjectFile(store.serialize());
  showToast(result.message, result.success ? "success" : "error");
}

/** Load project from a JSON file via native dialog */
async function handleLoad() {
  const result = await loadProjectFile();
  if (result.data) {
    store.deserialize(result.data);
    emit("export"); // trigger re-render via parent
    showToast(result.message, "success");
  } else {
    showToast(result.message, "error");
  }
}
</script>

<template>
  <div class="topbar">
    <div class="logo">TTY.<span>MathCast</span></div>

    <button @click="emit('play')" :class="{ stop: playing }">
      {{ playing ? "⏹ 停止预览" : "▶ 预览播放" }}
    </button>

    <div class="spacer"></div>

    <button @click="emit('settings')">⚙ 设置</button>

    <label style="margin: 0">
      分辨率
      <select v-model="resModel" style="margin-left: 6px">
        <option v-for="r in RESOLUTIONS" :key="r.value" :value="r.value">
          {{ r.label }}
        </option>
      </select>
    </label>

    <button @click="handleSave">💾 存项目</button>
    <button @click="handleLoad">📂 读项目</button>

    <button
      class="solid"
      @click="emit('export')"
      :class="{ loading: store.exporting }"
    >
      <span v-if="store.exporting" class="spinner"></span>
      {{ store.exporting ? "⏹ 停止导出" : "⤓ 导出视频" }}
    </button>

    <Transition name="toast">
      <div v-if="toast" class="toast" :class="toast.type">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.topbar {
  grid-column: 1 / 4;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  background: linear-gradient(135deg, #ffffff, #f3f6fa);
  border-bottom: 1px solid var(--line);
  position: relative;
  z-index: 10;
}

.topbar .logo {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.5px;
  margin-right: 6px;
}

.topbar .logo span {
  color: var(--accent);
}

.topbar .spacer {
  flex: 1;
}

/* Toast notification */
.toast {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

.toast.success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.toast.error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

/* Toast transition */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
