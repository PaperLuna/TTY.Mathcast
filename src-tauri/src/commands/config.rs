use parking_lot::RwLock;
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

/// Holds the path to the config file and provides read/write operations.
/// Replaces browser localStorage with a real file on disk.
pub struct ConfigState {
    config_path: PathBuf,
    cache: Arc<RwLock<Value>>,
}

impl ConfigState {
    /// Creates the config state, ensuring the config directory exists.
    /// Loads existing config into cache, or initializes with an empty object.
    pub fn new(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let config_dir = app
            .path()
            .app_config_dir()
            .map_err(|e| format!("Failed to resolve config dir: {}", e))?;

        // Ensure the directory exists
        fs::create_dir_all(&config_dir)?;

        let config_path = config_dir.join("config.json");

        // Try to load existing config; if missing or invalid, start fresh
        let cache = if config_path.exists() {
            match fs::read_to_string(&config_path) {
                Ok(content) => {
                    serde_json::from_str::<Value>(&content).unwrap_or_else(|_| Value::Object(
                        serde_json::Map::new()
                    ))
                }
                Err(_) => Value::Object(serde_json::Map::new()),
            }
        } else {
            Value::Object(serde_json::Map::new())
        };

        Ok(Self {
            config_path,
            cache: Arc::new(RwLock::new(cache)),
        })
    }

    /// Reads the entire config JSON from the in-memory cache.
    fn read(&self) -> Value {
        self.cache.read().clone()
    }

    /// Writes the entire config JSON, updating both the cache and the file on disk.
    fn write(&self, data: &Value) -> Result<(), Box<dyn std::error::Error>> {
        // Update cache
        {
            let mut guard = self.cache.write();
            *guard = data.clone();
        }
        // Persist to file atomically: write to temp then rename
        let tmp_path = self.config_path.with_extension("json.tmp");
        let mut file = fs::File::create(&tmp_path)?;
        let serialized = serde_json::to_string_pretty(data)?;
        file.write_all(serialized.as_bytes())?;
        file.flush()?;
        drop(file);

        // Atomic rename (on same filesystem)
        fs::rename(&tmp_path, &self.config_path)?;

        Ok(())
    }
}

// ─── Tauri Commands ───────────────────────────────────────────────

/// Reads the full config JSON object.
/// Called once on app startup to restore the previous session.
#[tauri::command]
pub fn read_config(state: tauri::State<'_, ConfigState>) -> Result<Value, String> {
    Ok(state.read())
}

/// Writes the full config JSON object to disk.
/// Called with debouncing from the frontend to persist state changes.
#[tauri::command]
pub fn write_config(
    state: tauri::State<'_, ConfigState>,
    data: Value,
) -> Result<(), String> {
    state.write(&data).map_err(|e| e.to_string())
}

/// Saves binary video data to a user-chosen file path.
/// Replaces the browser `<a download>` approach with a native file write.
#[tauri::command]
pub fn save_video(
    app: AppHandle,
    data: Vec<u8>,
    filename: String,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    // Show a native save dialog
    let file_path = app
        .dialog()
        .file()
        .add_filter("视频文件", &["mp4", "webm"])
        .set_file_name(&filename)
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            fs::write(&path_str, &data).map_err(|e| e.to_string())?;
            Ok(path_str)
        }
        None => Err("用户取消了保存".to_string()),
    }
}
