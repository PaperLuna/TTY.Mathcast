import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { ProjectState } from "@/types";

/**
 * Project file save/load using Tauri native dialogs.
 * Replaces `<a download>` and `<input type="file" accept="json">`.
 */

/** Result type for project file operations */
export interface ProjectFileResult {
  success: boolean;
  /** Human-readable message for user feedback */
  message: string;
}

/** Saves project state as JSON to a user-chosen file */
export async function saveProjectFile(
  state: Partial<ProjectState>
): Promise<ProjectFileResult> {
  try {
    const filePath = await save({
      defaultPath: "mathcast_project.json",
      filters: [{ name: "MathCast 项目", extensions: ["json"] }],
    });

    if (!filePath) {
      return { success: false, message: "已取消保存" };
    }

    const json = JSON.stringify(state, null, 2);
    await writeTextFile(filePath, json);

    const fileName = filePath.split(/[\\/]/).pop() || "mathcast_project.json";
    return { success: true, message: `项目已保存：${fileName}` };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[project] Save failed:", errMsg);
    return { success: false, message: `保存失败：${errMsg}` };
  }
}

/** Loads a project JSON file via native open dialog */
export async function loadProjectFile(): Promise<{
  data: Partial<ProjectState> | null;
  message: string;
}> {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: "MathCast 项目", extensions: ["json"] }],
    });

    if (!selected) {
      return { data: null, message: "已取消打开" };
    }

    const filePath = typeof selected === "string" ? selected : selected[0];
    if (!filePath) {
      return { data: null, message: "未选择文件" };
    }

    const text = await readTextFile(filePath);
    const parsed = JSON.parse(text) as Partial<ProjectState>;

    // Basic validation: check that essential fields exist
    if (!parsed || typeof parsed !== "object") {
      return { data: null, message: "文件格式无效：不是有效的 MathCast 项目" };
    }

    if (parsed.beats && !Array.isArray(parsed.beats)) {
      return { data: null, message: "文件格式无效：beats 字段格式错误" };
    }

    const fileName = filePath.split(/[\\/]/).pop() || "unknown";
    return { data: parsed, message: `项目已加载：${fileName}` };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[project] Load failed:", errMsg);

    if (errMsg.includes("JSON") || errMsg.includes("json")) {
      return { data: null, message: "文件格式无效：无法解析 JSON" };
    }
    return { data: null, message: `加载失败：${errMsg}` };
  }
}
