/// A single beat/step in the timeline
export interface Beat {
  type: "center" | "right" | "pagebreak";
  text: string;
  leftImgIndex: number | null;
  rightImgIndex: number | null;
  duration: number;
}

/// An uploaded image stored as a data URL
export interface StoredImage {
  name: string;
  url: string;
}

/// Theme definition for the stage
export interface Theme {
  label: string;
  bg: string;
  text: string;
  panel: string;
  border: string;
  red: string;
  accent: string;
  muted: string;
}

/// The complete project state that gets persisted
export interface ProjectState {
  beats: Beat[];
  leftImages: StoredImage[];
  rightImages: StoredImage[];
  theme: string;
  leftFit: string;
  colW: number[];
  stepFontSize: number;
  stepFontFamily: string;
  titleFontSize: number;
  titleFontFamily: string;
  stepGap: number;
  title: string;
  steps: string;
  W: number;
  H: number;
}

/// Computed state at a given beat index
export interface ComputedState {
  center: string[];
  right: string[];
  left: StoredImage | null;
  rimg: StoredImage | null;
  lastType: "center" | "right" | "pagebreak" | null;
  /** Current page number (1-based), incremented by pagebreak beats */
  page: number;
}
