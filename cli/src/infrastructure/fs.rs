use std::fs;
use std::path::{Path, PathBuf};

use crate::domain::ports::FileSystemPort;

#[derive(Default)]
pub struct StdFileSystemAdapter;

impl StdFileSystemAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl FileSystemPort for StdFileSystemAdapter {
    fn write_schema(&self, file_path: &str, content: &str) -> Result<(), String> {
        let path = Path::new(file_path);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
        fs::write(path, content).map_err(|e| format!("Failed to write file: {}", e))
    }

    fn read_schema(&self, file_path: &str) -> Result<String, String> {
        fs::read_to_string(Path::new(file_path)).map_err(|e| format!("Failed to read file: {}", e))
    }

    fn exists(&self, path: &str) -> bool {
        Path::new(path).exists()
    }

    fn mkdir(&self, path: &str) -> Result<(), String> {
        fs::create_dir_all(Path::new(path))
            .map_err(|e| format!("Failed to create directory: {}", e))
    }

    fn unlink(&self, path: &str) -> Result<(), String> {
        fs::remove_file(Path::new(path)).map_err(|e| format!("Failed to delete file: {}", e))
    }

    fn read_package_json_name(&self, path: &str) -> Option<String> {
        let content = fs::read_to_string(Path::new(path)).ok()?;
        let json: serde_json::Value = serde_json::from_str(&content).ok()?;
        json.get("name")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    }

    fn get_relative_path(&self, from: &str, to: &str) -> String {
        let from_path = Path::new(from);
        let to_path = Path::new(to);

        let from_dir = if from_path.is_dir() {
            from_path
        } else {
            from_path.parent().unwrap_or(Path::new("."))
        };

        match pathdiff::diff_paths(to_path, from_dir) {
            Some(diff) => diff.to_string_lossy().replace('\\', "/"),
            None => to.to_string(),
        }
    }

    fn get_absolute_path(&self, parts: &[&str]) -> String {
        let mut path_buf = PathBuf::new();
        for part in parts {
            path_buf.push(part);
        }
        // Normalize using standard path utilities
        let normalized = path_buf.to_string_lossy().replace('\\', "/");
        normalized
    }

    fn get_current_working_directory(&self) -> String {
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .to_string_lossy()
            .replace('\\', "/")
    }
}
