import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import type { StoredImage } from "@/types";

/**
 * Image loading utilities using Tauri native file dialogs.
 * Replaces `<input type="file">` with native OS file picker.
 */

/** Opens a native file dialog and loads selected images as data URLs */
export async function pickImages(): Promise<StoredImage[]> {
  const selected = await open({
    multiple: true,
    filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"] }],
  });

  if (!selected) return [];
  const paths = Array.isArray(selected) ? selected : [selected];
  const results: StoredImage[] = [];

  for (const path of paths) {
    try {
      const bytes = await readFile(path);
      const dataUrl = bytesToDataUrl(bytes, path);
      const name = path.split(/[\\/]/).pop() || "image";
      results.push({ name, url: dataUrl });
    } catch (e) {
      console.error("[image] Failed to read:", path, e);
    }
  }

  return results;
}

/** Convert raw bytes to a data URL with the correct MIME type */
function bytesToDataUrl(bytes: Uint8Array, path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  const mime = mimeMap[ext] || "application/octet-stream";
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
