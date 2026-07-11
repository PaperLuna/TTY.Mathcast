<script setup lang="ts">
import { ref } from "vue";
import { useProjectStore } from "@/stores/project";
import { esc } from "@/utils/renderer";

const store = useProjectStore();

const emit = defineEmits<{
  (e: "preview-update"): void;
}>();

const batchDur = ref(3);

/** Select a beat by clicking it */
function selectBeat(i: number) {
  store.current = i;
  emit("preview-update");
}

/** Handle beat property changes (image index, duration) */
function onBeatChange(i: number, key: string, value: string) {
  const beat = store.beats[i];
  if (key === "duration") {
    beat.duration = Math.max(0.3, parseFloat(value) || 1);
  } else {
    (beat as any)[key] = value === "-1" ? null : +value;
    emit("preview-update");
  }
  store.autosave();
}

/** Delete, move up, move down */
function beatAction(act: string, i: number) {
  if (act === "del") {
    store.beats.splice(i, 1);
    store.current = Math.min(store.current, store.beats.length - 1);
  }
  if (act === "up" && i > 0) {
    [store.beats[i - 1], store.beats[i]] = [store.beats[i], store.beats[i - 1]];
    store.current = i - 1;
  }
  if (act === "down" && i < store.beats.length - 1) {
    [store.beats[i + 1], store.beats[i]] = [store.beats[i], store.beats[i + 1]];
    store.current = i + 1;
  }
  emit("preview-update");
  store.autosave();
}

/** Auto-assign left images to beats in rotation */
function autoLeft() {
  if (!store.leftImages.length) return;
  store.beats.forEach((b, i) => (b.leftImgIndex = i % store.leftImages.length));
  emit("preview-update");
  store.autosave();
}

/** Auto-assign right images to beats in rotation */
function autoRight() {
  if (!store.rightImages.length) return;
  store.beats.forEach((b, i) => (b.rightImgIndex = i % store.rightImages.length));
  emit("preview-update");
  store.autosave();
}

/** Set all beat durations to the batch value */
function batchSetDuration() {
  const v = Math.max(0.3, parseFloat(batchDur.value.toString()) || 3);
  store.beats.forEach((b) => (b.duration = v));
  store.autosave();
}
</script>

<template>
  <div class="col-right">
    <div class="section">
      <h3>⑤ 打轴时间轴</h3>

      <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap">
        <button class="mini" @click="autoLeft">↻ 左图自动轮播</button>
        <button class="mini" @click="autoRight">↻ 右图自动轮播</button>
      </div>

      <div style="display: flex; gap: 6px; margin-bottom: 8px; align-items: center">
        <input
          type="number"
          v-model="batchDur"
          min="0.5"
          step="0.5"
          style="width: 70px"
        />
        <span style="font-size: 12px; color: var(--muted)">秒</span>
        <button class="mini" @click="batchSetDuration">统一设置时长</button>
      </div>

      <div id="timeline">
        <div v-if="store.beats.length === 0" class="hint">
          暂无步骤，先在左侧输入并点"应用"。
        </div>
        <div
          v-for="(b, i) in store.beats"
          :key="i"
          class="beat"
          :class="{ active: i === store.current }"
          @click="selectBeat(i)"
        >
          <div class="row1">
            <span class="badge" :class="b.type">{{ b.type === "center" ? "中" : b.type === "right" ? "续" : "换页" }}</span>
            <span class="txt" :title="b.text">{{ b.type === "pagebreak" ? "——— 换页 ———" : (b.text || "(空)") }}</span>
          </div>
          <template v-if="b.type !== 'pagebreak'">
          <div class="row2">
            <select
              :value="b.leftImgIndex == null ? -1 : b.leftImgIndex"
              @click.stop
              @change="onBeatChange(i, 'leftImgIndex', ($event.target as HTMLSelectElement).value)"
            >
              <option value="-1">不换图</option>
              <option
                v-for="(im, idx) in store.leftImages"
                :key="idx"
                :value="idx"
              >
                {{ idx + 1 }}. {{ im.name }}
              </option>
            </select>
            <select
              :value="b.rightImgIndex == null ? -1 : b.rightImgIndex"
              @click.stop
              @change="onBeatChange(i, 'rightImgIndex', ($event.target as HTMLSelectElement).value)"
            >
              <option value="-1">不换图</option>
              <option
                v-for="(im, idx) in store.rightImages"
                :key="idx"
                :value="idx"
              >
                {{ idx + 1 }}. {{ im.name }}
              </option>
            </select>
          </div>
          <div class="row3">
            <span style="font-size: 11px; color: var(--muted)">时长</span>
            <input
              type="number"
              min="0.3"
              step="0.5"
              :value="b.duration"
              @click.stop
              @change="onBeatChange(i, 'duration', ($event.target as HTMLInputElement).value)"
              style="width: 64px"
            />
            <button class="mini" @click.stop="beatAction('up', i)">↑</button>
            <button class="mini" @click.stop="beatAction('down', i)">↓</button>
            <button class="mini" @click.stop="beatAction('del', i)">✕</button>
          </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.col-right {
  border-left: 1px solid var(--line);
  overflow-y: auto;
  padding: 14px;
  background: var(--panel);
  display: flex;
  flex-direction: column;
}

.beat {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 9px;
  margin-bottom: 8px;
  background: var(--panel2);
  cursor: pointer;
}

.beat.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent) inset;
}

.beat .row1 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 600;
}

.badge.center {
  background: rgba(0, 0, 0, 0.08);
  color: var(--accent);
}

.badge.right {
  background: rgba(0, 0, 0, 0.06);
  color: var(--accent2);
}

.badge.pagebreak {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
  letter-spacing: 1px;
}

.beat .txt {
  font-size: 12px;
  color: var(--text);
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.beat .row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.beat .row3 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 7px;
}

.beat select,
.beat input[type="number"] {
  width: 100%;
  padding: 5px;
  font-size: 12px;
}
</style>
