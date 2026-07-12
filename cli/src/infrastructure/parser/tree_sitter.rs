use glob::glob;
use std::fs;
use std::path::Path;

use crate::domain::ports::{ParsedImport, ParsedNewExpression, ParsedSourceFile, ParserPort};

#[derive(Default)]
pub struct TreeSitterParserAdapter;

impl TreeSitterParserAdapter {
    pub fn new() -> Self {
        Self
    }

    fn get_glob_base_dir(&self, pattern: &str) -> std::path::PathBuf {
        let mut base = std::path::PathBuf::new();
        for component in std::path::Path::new(pattern).components() {
            let comp_str = component.as_os_str().to_string_lossy();
            if comp_str.contains('*')
                || comp_str.contains('?')
                || comp_str.contains('{')
                || comp_str.contains('[')
            {
                break;
            }
            base.push(component);
        }
        if base.as_os_str().is_empty() {
            std::path::PathBuf::from(".")
        } else {
            base
        }
    }

    fn get_files_recursively(&self, glob_pattern: &str) -> Vec<String> {
        let mut results = Vec::new();

        let base_dir = self.get_glob_base_dir(glob_pattern);
        let base_dir_abs = base_dir.canonicalize().unwrap_or_else(|_| base_dir.clone());
        let mut gitignore_builder = ignore::gitignore::GitignoreBuilder::new(&base_dir_abs);

        // Load parent .gitignore files starting from base_dir_abs upwards
        let mut current = base_dir_abs.clone();
        loop {
            let gitignore_path = current.join(".gitignore");
            if gitignore_path.exists() {
                if let Ok(abs_path) = gitignore_path.canonicalize() {
                    gitignore_builder.add(&abs_path);
                } else {
                    gitignore_builder.add(&gitignore_path);
                }
            }
            if !current.pop() {
                break;
            }
        }

        // Load nested .gitignore files starting from base_dir_abs downwards
        let nested_glob = base_dir_abs.join("**/.gitignore");
        let nested_glob_str = nested_glob.to_string_lossy();
        if let Ok(paths) = glob(&nested_glob_str) {
            for path in paths.flatten() {
                if let Ok(abs_path) = path.canonicalize() {
                    gitignore_builder.add(&abs_path);
                } else {
                    gitignore_builder.add(&path);
                }
            }
        }

        let gitignore = gitignore_builder
            .build()
            .unwrap_or_else(|_| ignore::gitignore::Gitignore::empty());

        fn expand_braces(pattern: &str) -> Vec<String> {
            if let (Some(start), Some(end)) = (pattern.find('{'), pattern.find('}')) {
                if start < end {
                    let mut expanded_patterns = Vec::new();
                    let prefix = &pattern[..start];
                    let suffix = &pattern[end + 1..];
                    let options = &pattern[start + 1..end];
                    for option in options.split(',') {
                        let expanded = format!("{}{}{}", prefix, option.trim(), suffix);
                        expanded_patterns.extend(expand_braces(&expanded));
                    }
                    return expanded_patterns;
                }
            }
            vec![pattern.to_string()]
        }

        let expanded_patterns = expand_braces(glob_pattern);
        for pattern in expanded_patterns {
            if let Ok(paths) = glob(&pattern) {
                for path in paths.flatten() {
                    if path.is_file() {
                        let path_str = path.to_string_lossy().replace('\\', "/");

                        let abs_path = path.canonicalize().unwrap_or_else(|_| path.clone());
                        let relative_path = pathdiff::diff_paths(&abs_path, &base_dir_abs)
                            .unwrap_or_else(|| path.clone());
                        let is_git_ignored = gitignore
                            .matched_path_or_any_parents(&relative_path, false)
                            .is_ignore();

                        let is_ignored = is_git_ignored;

                        if is_ignored {
                            continue;
                        }
                        results.push(path_str);
                    }
                }
            }
        }
        results.sort();
        results.dedup();
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
            } else if ext == "cs" {
                language = Some(tree_sitter_c_sharp::language());
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

                // C# Walk
                if ext == "cs" {
                    if node_type == "using_directive" {
                        let name_node = node.child_by_field_name("name").or_else(|| {
                            fn find_name_node(n: tree_sitter::Node) -> Option<tree_sitter::Node> {
                                if n.kind() == "qualified_name" || n.kind() == "identifier" {
                                    return Some(n);
                                }
                                let count = n.child_count();
                                for i in 0..count {
                                    if let Some(child) = n.child(i) {
                                        if let Some(res) = find_name_node(child) {
                                            return Some(res);
                                        }
                                    }
                                }
                                None
                            }
                            find_name_node(node)
                        });
                        if let Some(nn) = name_node {
                            if let Ok(text) = nn.utf8_text(source_code) {
                                imports.push(ParsedImport {
                                    module_specifier: text.to_string(),
                                });
                            }
                        }
                    }
                    if node_type == "object_creation_expression" {
                        let type_node = node.child_by_field_name("type").or_else(|| {
                            fn find_identifier(n: tree_sitter::Node) -> Option<tree_sitter::Node> {
                                if n.kind() == "identifier" {
                                    return Some(n);
                                }
                                let count = n.child_count();
                                for i in 0..count {
                                    if let Some(child) = n.child(i) {
                                        if let Some(res) = find_identifier(child) {
                                            return Some(res);
                                        }
                                    }
                                }
                                None
                            }
                            find_identifier(node)
                        });
                        if let Some(tn) = type_node {
                            if let Ok(text) = tn.utf8_text(source_code) {
                                new_expressions.push(ParsedNewExpression {
                                    class_name: text.to_string(),
                                });
                            }
                        }
                    }
                    if node_type == "parameter"
                        || node_type == "field_declaration"
                        || node_type == "property_declaration"
                    {
                        if let Some(type_node) = node.child_by_field_name("type") {
                            if let Ok(text) = type_node.utf8_text(source_code) {
                                new_expressions.push(ParsedNewExpression {
                                    class_name: text.to_string(),
                                });
                            }
                        }
                    }
                    if node_type == "invocation_expression" {
                        if let Some(fn_node) = node.child(0) {
                            if let Ok(text) = fn_node.utf8_text(source_code) {
                                call_expressions.push(text.to_string());
                            }
                        }
                    }
                    if node_type == "namespace_declaration"
                        || node_type == "file_scoped_namespace_declaration"
                    {
                        let name_node = node.child_by_field_name("name").or_else(|| {
                            fn find_name_node(n: tree_sitter::Node) -> Option<tree_sitter::Node> {
                                if n.kind() == "qualified_name" || n.kind() == "identifier" {
                                    return Some(n);
                                }
                                let count = n.child_count();
                                for i in 0..count {
                                    if let Some(child) = n.child(i) {
                                        if let Some(res) = find_name_node(child) {
                                            return Some(res);
                                        }
                                    }
                                }
                                None
                            }
                            find_name_node(node)
                        });
                        if let Some(nn) = name_node {
                            if let Ok(text) = nn.utf8_text(source_code) {
                                namespaces.push(text.to_string());
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

    #[test]
    fn test_get_files_recursively_with_braces() {
        let dir = tempdir().unwrap();
        let ts_file = dir.path().join("a.ts");
        let py_file = dir.path().join("b.py");
        let txt_file = dir.path().join("c.txt");

        fs::write(&ts_file, "").unwrap();
        fs::write(&py_file, "").unwrap();
        fs::write(&txt_file, "").unwrap();

        let adapter = TreeSitterParserAdapter::new();
        let pattern = format!(
            "{}{}*.{{ts,py}}",
            dir.path().to_str().unwrap(),
            std::path::MAIN_SEPARATOR
        );

        let matched = adapter.get_files_recursively(&pattern);
        assert_eq!(matched.len(), 2);

        let paths: Vec<String> = matched
            .iter()
            .map(|p| {
                Path::new(p)
                    .file_name()
                    .unwrap()
                    .to_str()
                    .unwrap()
                    .to_string()
            })
            .collect();
        assert!(paths.contains(&"a.ts".to_string()));
        assert!(paths.contains(&"b.py".to_string()));
        assert!(!paths.contains(&"c.txt".to_string()));
    }

    #[test]
    fn test_parse_c_sharp() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_file.cs");
        fs::write(
            &file_path,
            r#"
using System;
using MyNamespace.Data;

namespace MyNamespace.Controllers
{
    public class OrderController
    {
        private readonly IOrderService _orderService;

        public OrderController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        public void Create()
        {
            var db = new OrderDbContext();
            db.SaveChanges();
        }
    }
}
        "#,
        )
        .unwrap();

        let adapter = TreeSitterParserAdapter::new();
        let pattern = file_path.to_str().unwrap();
        let results = adapter.parse_source_files(pattern).unwrap();

        assert_eq!(results.len(), 1);
        let parsed = &results[0];

        // Assert imports
        assert!(parsed
            .imports
            .iter()
            .any(|i| i.module_specifier == "System"));
        assert!(parsed
            .imports
            .iter()
            .any(|i| i.module_specifier == "MyNamespace.Data"));

        // Assert new expressions
        assert!(parsed
            .new_expressions
            .iter()
            .any(|n| n.class_name == "IOrderService"));
        assert!(parsed
            .new_expressions
            .iter()
            .any(|n| n.class_name == "OrderDbContext"));

        // Assert call expressions
        assert!(parsed
            .call_expressions
            .contains(&"db.SaveChanges".to_string()));

        // Assert namespaces
        assert_eq!(
            parsed.namespaces,
            vec!["MyNamespace.Controllers".to_string()]
        );
    }

    #[test]
    fn test_ignore_behavior() {
        let dir = tempdir().unwrap();
        let sub_dir = dir.path().join("sub");
        fs::create_dir_all(&sub_dir).unwrap();

        let gitignore_file = sub_dir.join(".gitignore");
        fs::write(&gitignore_file, "*").unwrap();

        // Test 1: Absolute path
        let mut builder1 = ignore::gitignore::GitignoreBuilder::new(dir.path());
        builder1.add(&gitignore_file);
        let gitignore1 = builder1.build().unwrap();

        // Test 2: Relative path
        let mut builder2 = ignore::gitignore::GitignoreBuilder::new(dir.path());
        builder2.add(Path::new("sub").join(".gitignore"));
        let gitignore2 = builder2.build().unwrap();

        // Test 3: Prefixed path
        let mut builder3 = ignore::gitignore::GitignoreBuilder::new(dir.path());
        builder3.add_line(None, "sub/*").unwrap();
        let gitignore3 = builder3.build().unwrap();

        let test_file_in_sub = sub_dir.join("a.ts");
        let relative_in_sub = pathdiff::diff_paths(&test_file_in_sub, dir.path()).unwrap();

        let test_file_outside = dir.path().join("a.ts");
        let relative_outside = pathdiff::diff_paths(&test_file_outside, dir.path()).unwrap();

        println!("Test 1 (Absolute add):");
        println!("Debug representation: {:?}", gitignore1);
        println!(
            "in_sub ignored = {}",
            gitignore1
                .matched_path_or_any_parents(&relative_in_sub, false)
                .is_ignore()
        );
        println!(
            "outside ignored = {}",
            gitignore1
                .matched_path_or_any_parents(&relative_outside, false)
                .is_ignore()
        );

        println!("Test 2 (Relative add):");
        println!("Debug representation: {:?}", gitignore2);
        println!(
            "in_sub ignored = {}",
            gitignore2
                .matched_path_or_any_parents(&relative_in_sub, false)
                .is_ignore()
        );
        println!(
            "outside ignored = {}",
            gitignore2
                .matched_path_or_any_parents(&relative_outside, false)
                .is_ignore()
        );

        println!("Test 3 (Prefixed add):");
        println!("Debug representation: {:?}", gitignore3);
        println!(
            "in_sub ignored = {}",
            gitignore3
                .matched_path_or_any_parents(&relative_in_sub, false)
                .is_ignore()
        );
        println!(
            "outside ignored = {}",
            gitignore3
                .matched_path_or_any_parents(&relative_outside, false)
                .is_ignore()
        );
    }
}
