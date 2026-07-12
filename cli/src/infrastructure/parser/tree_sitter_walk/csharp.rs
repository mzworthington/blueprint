use crate::domain::ports::{ParsedImport, ParsedNewExpression};

use super::LanguageWalker;

pub struct CsWalker;

impl LanguageWalker for CsWalker {
    fn walk_node(
        &self,
        node: tree_sitter::Node,
        source_code: &[u8],
        imports: &mut Vec<ParsedImport>,
        new_expressions: &mut Vec<ParsedNewExpression>,
        call_expressions: &mut Vec<String>,
        namespaces: &mut Vec<String>,
    ) {
        let node_type = node.kind();

        if node_type == "using_directive" {
            let name_node = node
                .child_by_field_name("name")
                .or_else(|| find_name_node(node));
            if let Some(nn) = name_node {
                if let Ok(text) = nn.utf8_text(source_code) {
                    imports.push(ParsedImport {
                        module_specifier: text.to_string(),
                    });
                }
            }
        }
        if node_type == "object_creation_expression" {
            let type_node = node
                .child_by_field_name("type")
                .or_else(|| find_identifier(node));
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
        if node_type == "namespace_declaration" || node_type == "file_scoped_namespace_declaration"
        {
            let name_node = node
                .child_by_field_name("name")
                .or_else(|| find_name_node(node));
            if let Some(nn) = name_node {
                if let Ok(text) = nn.utf8_text(source_code) {
                    namespaces.push(text.to_string());
                }
            }
        }
    }
}

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
