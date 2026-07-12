use crate::domain::model::{SystemDependency, SystemNode};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ParsedImport {
    pub module_specifier: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ParsedNewExpression {
    pub class_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ParsedSourceFile {
    pub file_path: String,
    pub relative_path: String,
    pub base_name: String,
    pub is_test_file: bool,
    pub imports: Vec<ParsedImport>,
    pub new_expressions: Vec<ParsedNewExpression>,
    pub call_expressions: Vec<String>,
    #[serde(default)]
    pub namespaces: Vec<String>,
}

pub trait ParserPort: Send + Sync {
    fn parse_source_files(&self, glob_pattern: &str) -> Result<Vec<ParsedSourceFile>, String>;
}

pub trait LayoutPort: Send + Sync {
    fn compute_layout(
        &self,
        nodes: Vec<SystemNode>,
        dependencies: Vec<SystemDependency>,
    ) -> Result<Vec<SystemNode>, String>;
}

pub trait FileSystemPort: Send + Sync {
    fn write_schema(&self, file_path: &str, content: &str) -> Result<(), String>;
    fn exists(&self, path: &str) -> bool;
    fn mkdir(&self, path: &str) -> Result<(), String>;
    fn unlink(&self, path: &str) -> Result<(), String>;
    fn read_package_json_name(&self, path: &str) -> Option<String>;
    fn get_relative_path(&self, from: &str, to: &str) -> String;
    fn get_absolute_path(&self, parts: &[&str]) -> String;
    fn get_current_working_directory(&self) -> String;
}

pub trait LoggerPort: Send + Sync {
    fn info(&self, msg: &str);
    fn warn(&self, msg: &str);
    fn error(&self, msg: &str, err: Option<&str>);
}
