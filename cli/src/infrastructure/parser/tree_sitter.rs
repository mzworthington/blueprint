use glob::glob;
use std::fs;
use std::path::Path;

use crate::domain::ports::{ParsedImport, ParsedNewExpression, ParsedSourceFile, ParserPort};

pub struct TreeSitterParserAdapter;

impl TreeSitterParserAdapter {
    pub fn new() -> Self {
        Self
    }

    fn get_files_recursively(&self, glob_pattern: &str) -> Vec<String> {
        let mut results = Vec::new();
        if let Ok(paths) = glob(glob_pattern) {
            for entry in paths {
                if let Ok(path) = entry {
                    if path.is_file() {
                        results.push(path.to_string_lossy().replace('\\', "/"));
                    }
                }
            }
        }
        results
    }
}

impl ParserPort for TreeSitterParserAdapter {
    fn parse_source_files(&self, glob_pattern: &str) -> Result<Vec<ParsedSourceFile>, String> {
        let matched_files = self.get_files_recursively(glob_pattern);
        let mut result = Vec::new();

        for file_path in matched_files {
            let path_obj = Path::new(&file_path);
            let ext = path_obj
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();

            let mut language = None;
            if ext == "ts" {
                language = Some(tree_sitter_typescript::language_typescript());
            } else if ext == "tsx" {
                language = Some(tree_sitter_typescript::language_tsx());
            } else if ext == "py" {
                language = Some(tree_sitter_python::language());
            } else if ext == "js" || ext == "jsx" {
                // Reuse ts/tsx parser for js/jsx
                language = Some(tree_sitter_typescript::language_tsx());
            }

            let language = match language {
                Some(l) => l,
                None => continue, // Skip unsupported extensions
            };

            let content = match fs::read_to_string(path_obj) {
                Ok(c) => c,
                Err(_) => continue,
            };

            let mut parser = tree_sitter::Parser::new();
            parser
                .set_language(language)
                .map_err(|e| format!("Failed to set tree-sitter language: {:?}", e))?;

            let tree = match parser.parse(&content, None) {
                Some(t) => t,
                None => continue,
            };

            let relative_path = pathdiff::diff_paths(path_obj, std::env::current_dir().unwrap())
                .unwrap_or_else(|| path_obj.to_path_buf())
                .to_string_lossy()
                .replace('\\', "/");
            let base_name = path_obj
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            let is_test_file =
                relative_path.contains(".test.") || relative_path.contains("setupTests");

            let mut imports = Vec::new();
            let mut new_expressions = Vec::new();
            let mut call_expressions = Vec::new();
            let mut namespaces = Vec::new();

            let source_bytes = content.as_bytes();
            fn walk(
                node: tree_sitter::Node,
                source_code: &[u8],
                ext: &str,
                imports: &mut Vec<ParsedImport>,
                new_expressions: &mut Vec<ParsedNewExpression>,
                call_expressions: &mut Vec<String>,
                namespaces: &mut Vec<String>,
            ) {
                let node_type = node.kind();

                // TypeScript/JavaScript Walk
                if ext == "ts" || ext == "tsx" || ext == "js" || ext == "jsx" {
                    if node_type == "import_statement" {
                        if let Some(source) = node.child_by_field_name("source") {
                            let text = source
                                .utf8_text(source_code)
                                .unwrap_or("")
                                .trim_matches(|c| c == '\'' || c == '"' || c == '`');
                            imports.push(ParsedImport {
                                module_specifier: text.to_string(),
                            });
                        }
                    }
                    if node_type == "new_expression" {
                        if let Some(constructor) = node.child_by_field_name("constructor") {
                            let text = constructor.utf8_text(source_code).unwrap_or("");
                            new_expressions.push(ParsedNewExpression {
                                class_name: text.to_string(),
                            });
                        }
                    }
                    if node_type == "call_expression" {
                        if let Some(function) = node.child_by_field_name("function") {
                            let text = function.utf8_text(source_code).unwrap_or("");
                            call_expressions.push(text.to_string());
                        }
                    }
                }

                // Python Walk
                if ext == "py" {
                    if node_type == "import_statement" {
                        // Recursively find all dotted_names
                        fn find_dotted_names(
                            n: tree_sitter::Node,
                            source_code: &[u8],
                            list: &mut Vec<String>,
                        ) {
                            if n.kind() == "dotted_name" {
                                if let Ok(text) = n.utf8_text(source_code) {
                                    list.push(text.to_string());
                                }
                            }
                            let count = n.child_count();
                            for i in 0..count {
                                if let Some(child) = n.child(i) {
                                    find_dotted_names(child, source_code, list);
                                }
                            }
                        }
                        let mut list = Vec::new();
                        find_dotted_names(node, source_code, &mut list);
                        for item in list {
                            imports.push(ParsedImport {
                                module_specifier: item,
                            });
                        }
                    }
                    if node_type == "import_from_statement" {
                        if let Some(module_name) = node.child_by_field_name("module_name") {
                            if let Ok(text) = module_name.utf8_text(source_code) {
                                imports.push(ParsedImport {
                                    module_specifier: text.to_string(),
                                });
                            }
                        }
                    }
                    if node_type == "call" {
                        if let Some(function) = node.child_by_field_name("function") {
                            if let Ok(text) = function.utf8_text(source_code) {
                                call_expressions.push(text.to_string());
                                if let Some(first_char) = text.chars().next() {
                                    if first_char.is_ascii_uppercase() {
                                        new_expressions.push(ParsedNewExpression {
                                            class_name: text.to_string(),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                let count = node.child_count();
                for i in 0..count {
                    if let Some(child) = node.child(i) {
                        walk(
                            child,
                            source_code,
                            ext,
                            imports,
                            new_expressions,
                            call_expressions,
                            namespaces,
                        );
                    }
                }
            }

            walk(
                tree.root_node(),
                source_bytes,
                &ext,
                &mut imports,
                &mut new_expressions,
                &mut call_expressions,
                &mut namespaces,
            );

            result.push(ParsedSourceFile {
                file_path,
                relative_path,
                base_name,
                is_test_file,
                imports,
                new_expressions,
                call_expressions,
                namespaces,
            });
        }

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_parse_typescript() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_file.ts");
        fs::write(
            &file_path,
            r#"
            import { db } from "./db";
            import axios from "axios";

            const client = new ApiClient();
            db.query("select * from users");
        "#,
        )
        .unwrap();

        let adapter = TreeSitterParserAdapter::new();
        let pattern = file_path.to_str().unwrap();
        let results = adapter.parse_source_files(pattern).unwrap();

        assert_eq!(results.len(), 1);
        let parsed = &results[0];
        assert_eq!(parsed.base_name, "test_file");
        assert_eq!(parsed.is_test_file, false);

        // Assert imports
        assert!(parsed.imports.iter().any(|i| i.module_specifier == "./db"));
        assert!(parsed.imports.iter().any(|i| i.module_specifier == "axios"));

        // Assert new expressions
        assert!(parsed
            .new_expressions
            .iter()
            .any(|n| n.class_name == "ApiClient"));

        // Assert call expressions
        assert!(parsed.call_expressions.contains(&"db.query".to_string()));
    }

    #[test]
    fn test_parse_python() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_file.py");
        fs::write(
            &file_path,
            r#"
import os
from database import DatabaseClient

client = DatabaseClient()
print("Hello World")
        "#,
        )
        .unwrap();

        let adapter = TreeSitterParserAdapter::new();
        let pattern = file_path.to_str().unwrap();
        let results = adapter.parse_source_files(pattern).unwrap();

        assert_eq!(results.len(), 1);
        let parsed = &results[0];

        // Assert imports
        assert!(parsed.imports.iter().any(|i| i.module_specifier == "os"));
        assert!(parsed
            .imports
            .iter()
            .any(|i| i.module_specifier == "database"));

        // Assert new expressions (heuristic: capitalized call name)
        assert!(parsed
            .new_expressions
            .iter()
            .any(|n| n.class_name == "DatabaseClient"));

        // Assert call expressions
        assert!(parsed.call_expressions.contains(&"print".to_string()));
    }
}
