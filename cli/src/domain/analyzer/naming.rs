use crate::domain::ports::{FileSystemPort, ParsedSourceFile};
use std::collections::HashMap;

pub fn sanitize_id(raw: &str) -> String {
    raw.to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

pub fn get_meaningful_name(
    fs: &dyn FileSystemPort,
    source_files: &[ParsedSourceFile],
    glob_pattern: &str,
) -> String {
    // 1. Resolve from C# namespaces
    let mut top_namespaces = Vec::new();
    for file in source_files {
        for ns in &file.namespaces {
            if let Some(first_part) = ns.split('.').next() {
                top_namespaces.push(first_part.to_string());
            }
        }
    }

    if !top_namespaces.is_empty() {
        let mut freq_map = HashMap::new();
        let mut max_count = 0;
        let mut most_freq_name = String::new();
        for name in top_namespaces {
            let count = freq_map.entry(name.clone()).or_insert(0);
            *count += 1;
            if *count > max_count {
                max_count = *count;
                most_freq_name = name;
            }
        }
        if !most_freq_name.is_empty() {
            return most_freq_name;
        }
    }

    // 2. Resolve package.json
    if let Some(base_dir) = glob_pattern.split("**").next() {
        let clean_base = base_dir.trim_end_matches('/').trim_end_matches('\\');
        let scan_dir = if !clean_base.is_empty() {
            fs.get_absolute_path(&[&fs.get_current_working_directory(), clean_base])
        } else {
            fs.get_current_working_directory()
        };

        let mut check_dir = std::path::PathBuf::from(&scan_dir);
        let cwd_path = std::path::PathBuf::from(&fs.get_current_working_directory());
        while check_dir.starts_with(&cwd_path) {
            let pkg_path = fs.get_absolute_path(&[&check_dir.to_string_lossy(), "package.json"]);
            if fs.exists(&pkg_path) {
                if let Some(name) = fs.read_package_json_name(&pkg_path) {
                    if name != "root" {
                        let name_without_scope = if name.contains('/') {
                            name.split('/').nth(1).unwrap_or(&name).to_string()
                        } else {
                            name
                        };
                        return name_without_scope;
                    }
                }
            }
            if !check_dir.pop() {
                break;
            }
        }

        // Fallback check in CWD
        let cwd_pkg = fs.get_absolute_path(&[&fs.get_current_working_directory(), "package.json"]);
        if fs.exists(&cwd_pkg) {
            if let Some(name) = fs.read_package_json_name(&cwd_pkg) {
                if name != "root" {
                    let name_without_scope = if name.contains('/') {
                        name.split('/').nth(1).unwrap_or(&name).to_string()
                    } else {
                        name
                    };
                    return name_without_scope;
                }
            }
        }
    }

    // 3. Resolve from base directory name of glob pattern
    if let Some(base_dir) = glob_pattern.split("**").next() {
        let clean_base = base_dir.trim_end_matches('/').trim_end_matches('\\');
        if !clean_base.is_empty() {
            if let Some(base_name) = clean_base
                .split(&['/', '\\'][..])
                .filter(|s| !s.is_empty())
                .last()
            {
                return base_name.to_string();
            }
        }
    }

    // 4. Fallback to current working directory name
    let cwd = fs.get_current_working_directory();
    let parts: Vec<&str> = cwd
        .split(&['/', '\\'][..])
        .filter(|s| !s.is_empty())
        .collect();
    parts.last().cloned().unwrap_or("blueprint").to_string()
}

pub fn get_display_name(meaningful_name: &str) -> String {
    if meaningful_name.contains('-') || meaningful_name.contains('_') {
        meaningful_name
            .split(&['-', '_'][..])
            .map(|w| {
                if w.is_empty() {
                    "".to_string()
                } else {
                    let mut c = w.chars();
                    c.next().unwrap().to_uppercase().collect::<String>() + c.as_str()
                }
            })
            .collect::<Vec<String>>()
            .join(" ")
    } else if !meaningful_name.is_empty() {
        let mut c = meaningful_name.chars();
        c.next().unwrap().to_uppercase().collect::<String>() + c.as_str()
    } else {
        String::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct MockFileSystem {
        pkg_name: Option<String>,
    }

    impl FileSystemPort for MockFileSystem {
        fn exists(&self, _path: &str) -> bool {
            self.pkg_name.is_some()
        }
        fn get_current_working_directory(&self) -> String {
            "/workspace/my-project".to_string()
        }
        fn get_absolute_path(&self, parts: &[&str]) -> String {
            parts.join("/")
        }
        fn read_package_json_name(&self, _path: &str) -> Option<String> {
            self.pkg_name.clone()
        }
        fn mkdir(&self, _path: &str) -> Result<(), String> {
            Ok(())
        }
        fn write_schema(&self, _path: &str, _content: &str) -> Result<(), String> {
            Ok(())
        }
        fn unlink(&self, _path: &str) -> Result<(), String> {
            Ok(())
        }
        fn get_relative_path(&self, _from: &str, _to: &str) -> String {
            "".to_string()
        }
    }

    #[test]
    fn test_sanitize_id() {
        assert_eq!(sanitize_id("MyClass-Name!"), "myclass-name_");
        assert_eq!(sanitize_id("simple_id"), "simple_id");
    }

    #[test]
    fn test_get_display_name() {
        assert_eq!(get_display_name("my-cool-service"), "My Cool Service");
        assert_eq!(get_display_name("some_snake_case"), "Some Snake Case");
        assert_eq!(get_display_name("Capitalized"), "Capitalized");
        assert_eq!(get_display_name(""), "");
    }

    #[test]
    fn test_get_meaningful_name_namespace() {
        let fs = MockFileSystem { pkg_name: None };
        let source_files = vec![ParsedSourceFile {
            file_path: "abc.cs".to_string(),
            relative_path: "abc.cs".to_string(),
            base_name: "abc".to_string(),
            is_test_file: false,
            imports: vec![],
            new_expressions: vec![],
            call_expressions: vec![],
            namespaces: vec!["MyCompany.MyProduct.Core".to_string()],
        }];
        let name = get_meaningful_name(&fs, &source_files, "**/*.cs");
        assert_eq!(name, "MyCompany");
    }

    #[test]
    fn test_get_meaningful_name_package_json() {
        let fs = MockFileSystem {
            pkg_name: Some("@scope/my-awesome-package".to_string()),
        };
        let source_files = vec![];
        let name = get_meaningful_name(&fs, &source_files, "packages/my-package/**/*.ts");
        assert_eq!(name, "my-awesome-package");
    }

    #[test]
    fn test_get_meaningful_name_base_dir() {
        let fs = MockFileSystem { pkg_name: None };
        let source_files = vec![];
        let name = get_meaningful_name(&fs, &source_files, "packages/api-service/**/*.ts");
        assert_eq!(name, "api-service");
    }
}
