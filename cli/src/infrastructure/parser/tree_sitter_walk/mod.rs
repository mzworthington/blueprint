mod csharp;
mod python;
mod typescript;

use crate::domain::ports::{ParsedImport, ParsedNewExpression};

pub trait LanguageWalker {
    fn walk_node(
        &self,
        node: tree_sitter::Node,
        source_code: &[u8],
        imports: &mut Vec<ParsedImport>,
        new_expressions: &mut Vec<ParsedNewExpression>,
        call_expressions: &mut Vec<String>,
        namespaces: &mut Vec<String>,
    );
}

fn get_walker(ext: &str) -> Option<Box<dyn LanguageWalker>> {
    match ext {
        "ts" | "tsx" | "js" | "jsx" => Some(Box::new(typescript::TsWalker)),
        "py" => Some(Box::new(python::PyWalker)),
        "cs" => Some(Box::new(csharp::CsWalker)),
        _ => None,
    }
}

pub fn walk(
    node: tree_sitter::Node,
    source_code: &[u8],
    ext: &str,
    imports: &mut Vec<ParsedImport>,
    new_expressions: &mut Vec<ParsedNewExpression>,
    call_expressions: &mut Vec<String>,
    namespaces: &mut Vec<String>,
) {
    let walker = match get_walker(ext) {
        Some(w) => w,
        None => return,
    };

    walker.walk_node(
        node,
        source_code,
        imports,
        new_expressions,
        call_expressions,
        namespaces,
    );

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

#[cfg(test)]
mod tests {
    use super::super::tree_sitter::TreeSitterParserAdapter;
    use crate::domain::ports::ParserPort;
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

        assert!(parsed.imports.iter().any(|i| i.module_specifier == "./db"));
        assert!(parsed.imports.iter().any(|i| i.module_specifier == "axios"));

        assert!(parsed
            .new_expressions
            .iter()
            .any(|n| n.class_name == "ApiClient"));

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

        assert!(parsed.imports.iter().any(|i| i.module_specifier == "os"));
        assert!(parsed
            .imports
            .iter()
            .any(|i| i.module_specifier == "database"));

        assert!(parsed
            .new_expressions
            .iter()
            .any(|n| n.class_name == "DatabaseClient"));

        assert!(parsed.call_expressions.contains(&"print".to_string()));
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

        assert!(parsed
            .imports
            .iter()
            .any(|i| i.module_specifier == "System"));
        assert!(parsed
            .imports
            .iter()
            .any(|i| i.module_specifier == "MyNamespace.Data"));

        assert!(parsed
            .new_expressions
            .iter()
            .any(|n| n.class_name == "IOrderService"));
        assert!(parsed
            .new_expressions
            .iter()
            .any(|n| n.class_name == "OrderDbContext"));

        assert!(parsed
            .call_expressions
            .contains(&"db.SaveChanges".to_string()));

        assert_eq!(
            parsed.namespaces,
            vec!["MyNamespace.Controllers".to_string()]
        );
    }
}
