use crate::domain::ports::{ParsedImport, ParsedNewExpression};

use super::LanguageWalker;

pub struct PyWalker;

impl LanguageWalker for PyWalker {
    fn walk_node(
        &self,
        node: tree_sitter::Node,
        source_code: &[u8],
        imports: &mut Vec<ParsedImport>,
        new_expressions: &mut Vec<ParsedNewExpression>,
        call_expressions: &mut Vec<String>,
        _namespaces: &mut Vec<String>,
    ) {
        let node_type = node.kind();

        if node_type == "import_statement" {
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
}

fn find_dotted_names(n: tree_sitter::Node, source_code: &[u8], list: &mut Vec<String>) {
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
