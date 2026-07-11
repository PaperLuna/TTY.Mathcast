import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Beat, StoredImage } from "@/types";
import { FONT_VAL, createDefaultState } from "@/utils/constants";
import { loadConfig, saveConfig } from "@/composables/useConfig";

export const useProjectStore = defineStore("project", () => {
  // ── State ──────────────────────────────────────────────
  const beats = ref<Beat[]>([]);
  const leftImages = ref<StoredImage[]>([]);
  const rightImages = ref<StoredImage[]>([]);
  const current = ref(-1);

  const theme = ref("white");
  const leftFit = ref("contain");
  const colW = ref([22, 48, 30]);
  const leftImgOffset = ref(50);   // vertical offset % for left column image
  const rightImgOffset = ref(50);  // vertical offset % for right column image

  const stepFontSize = ref(33);
  const stepFontFamily = ref(FONT_VAL.sans);
  const titleFontSize = ref(38);
  const titleFontFamily = ref(FONT_VAL.sans);
  const stepGap = ref(8);

  const title = ref("");
  const steps = ref("");

  const W = ref(1920);
  const H = ref(1080);

  // UI state
  const playing = ref(false);
  const exporting = ref(false);
  const cancelFlag = ref(false);
  const dirty = ref(false);
  const applying = ref(false);

  // ── Computed ───────────────────────────────────────────
  const resolution = computed(() => `${W.value}x${H.value}`);

  const currentBeat = computed(() =>
    current.value >= 0 && current.value < beats.value.length
      ? beats.value[current.value]
      : null
  );

  // ── Actions ────────────────────────────────────────────

  function setResolution(res: string) {
    const [w, h] = res.split("x").map(Number);
    W.value = w;
    H.value = h;
    markDirty();
  }

  function markDirty() {
    if (applying.value) return;
    dirty.value = true;
  }

  function clearDirty() {
    dirty.value = false;
  }

  function setApplying(v: boolean) {
    applying.value = v;
  }

  /** Serialize the full project state for persistence */
  function serialize() {
    return {
      beats: beats.value,
      leftImages: leftImages.value,
      rightImages: rightImages.value,
      theme: theme.value,
      leftFit: leftFit.value,
      colW: colW.value,
      leftImgOffset: leftImgOffset.value,
      rightImgOffset: rightImgOffset.value,
      stepFontSize: stepFontSize.value,
      stepFontFamily: stepFontFamily.value,
      titleFontSize: titleFontSize.value,
      titleFontFamily: titleFontFamily.value,
      stepGap: stepGap.value,
      title: title.value,
      steps: steps.value,
      W: W.value,
      H: H.value,
    };
  }

  /** Restore project state from a data object */
  function deserialize(d: any) {
    const def = createDefaultState();
    beats.value = d.beats || [];
    leftImages.value = d.leftImages || [];
    rightImages.value = d.rightImages || [];
    theme.value = d.theme || "white";
    leftFit.value = d.leftFit || "contain";
    colW.value = d.colW || [22, 48, 30];
    leftImgOffset.value = d.leftImgOffset != null ? d.leftImgOffset : 50;
    rightImgOffset.value = d.rightImgOffset != null ? d.rightImgOffset : 50;
    stepFontSize.value = d.stepFontSize || 33;
    stepFontFamily.value = d.stepFontFamily || FONT_VAL.sans;
    titleFontSize.value = d.titleFontSize || 38;
    titleFontFamily.value = d.titleFontFamily || FONT_VAL.sans;
    stepGap.value = d.stepGap != null ? d.stepGap : 8;
    title.value = d.title || "";
    W.value = d.W || 1920;
    H.value = d.H || 1080;

    // Backward compat: merge old `cont` field into steps
    let stepsText = d.steps || "";
    if (d.cont) {
      const c = d.cont
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l)
        .map((l: string) => ">> " + l);
      if (c.length) stepsText += (stepsText ? "\n" : "") + c.join("\n");
    }
    steps.value = stepsText;

    current.value = beats.value.length - 1;
    dirty.value = false;
  }

  /** Auto-save to config file (Rust-side) with debouncing */
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function autosave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await saveConfig(serialize());
    }, 500);
  }

  /** Load config from Rust-side file on startup */
  async function loadFromConfig() {
    const data = await loadConfig();
    if (data && Object.keys(data).length > 0) {
      deserialize(data);
      return true;
    }
    return false;
  }

  return {
    // state
    beats, leftImages, rightImages, current,
    theme, leftFit, colW, leftImgOffset, rightImgOffset,
    stepFontSize, stepFontFamily, titleFontSize, titleFontFamily, stepGap,
    title, steps, W, H,
    playing, exporting, cancelFlag, dirty, applying,
    // computed
    resolution, currentBeat,
    // actions
    setResolution, markDirty, clearDirty, setApplying,
    serialize, deserialize, autosave, loadFromConfig,
  };
});
