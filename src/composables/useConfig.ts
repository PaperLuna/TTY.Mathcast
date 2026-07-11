import { invoke } from "@tauri-apps/api/core";
import type { ProjectState } from "@/types";

/**
 * Configuration persistence via Rust-side file operations.
 * Replaces browser localStorage with a JSON file in the app config directory.
 *
 * The Rust backend handles:
 *   - `read_config`  → reads config.json from app_config_dir
 *   - `write_config` → atomically writes config.json to app_config_dir
 */

/// Loads the config JSON from the Rust-side file
export async function loadConfig(): Promise<Partial<ProjectState> | null> {
  try {
    const data = await invoke<Record<string, unknown>>("read_config");
    return data && Object.keys(data).length > 0 ? (data as Partial<ProjectState>) : null;
  } catch (e) {
    console.error("[config] Failed to load config:", e);
    return null;
  }
}

/// Saves the config JSON to the Rust-side file
export async function saveConfig(data: Partial<ProjectState>): Promise<void> {
  try {
    await invoke("write_config", { data });
  } catch (e) {
    console.error("[config] Failed to save config:", e);
  }
}

/// Saves binary video data to a user-chosen file via native dialog
export async function saveVideo(
  data: Uint8Array,
  filename: string
): Promise<string | null> {
  try {
    const path = await invoke<string>("save_video", {
      data: Array.from(data),
      filename,
    });
    return path;
  } catch (e) {
    console.error("[video] Save cancelled or failed:", e);
    return null;
  }
}
