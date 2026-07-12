use crate::domain::ports::{ParsedImport, ParsedNewExpression};

use super::LanguageWalker;

pub struct TsWalker;

impl LanguageWalker for TsWalker {
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
}
