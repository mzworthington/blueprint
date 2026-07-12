use crate::domain::analyzer::naming::sanitize_id;
use crate::domain::model::{DependencyType, NodeType, SystemDependency, SystemNode};
use crate::domain::ports::ParsedSourceFile;
use std::collections::HashMap;

const CLIENT_ID: &str = "frontend-client";

const REACT_KEYWORDS: &[&str] = &["react", "@xyflow/react"];
const DB_KEYWORDS: &[&str] = &["prisma", "knex", "pg", "mongodb"];
const QUEUE_KEYWORDS: &[&str] = &["kafkajs", "bullmq", "amqplib", "mqtt"];
const API_KEYWORDS: &[&str] = &["express", "fastify", "@nestjs/common"];
const DB_CLASS_KEYWORDS: &[&str] = &["PrismaClient", "MongoClient"];

fn matches_any(haystack: &str, needles: &[&str]) -> bool {
    needles.iter().any(|n| haystack.contains(n))
}

fn import_matches(file: &ParsedSourceFile, keywords: &[&str]) -> bool {
    file.imports
        .iter()
        .any(|i| matches_any(&i.module_specifier, keywords))
}

fn class_matches(file: &ParsedSourceFile, keywords: &[&str]) -> bool {
    file.new_expressions
        .iter()
        .any(|e| matches_any(&e.class_name, keywords))
}

fn classify(file: &ParsedSourceFile) -> (NodeType, &'static str) {
    if import_matches(file, REACT_KEYWORDS) {
        return (NodeType::GatewayApi, "React Component");
    }
    if import_matches(file, DB_KEYWORDS) || class_matches(file, DB_CLASS_KEYWORDS) {
        return (NodeType::RelationalDatabase, "Database Client");
    }
    if import_matches(file, QUEUE_KEYWORDS) {
        return (NodeType::EventBroker, "Event Client");
    }
    if import_matches(file, API_KEYWORDS) {
        return (NodeType::RestApi, "REST Controller");
    }

    // Heuristic: capitalized class name from `new` that contains queue/kafka keywords
    for ne in &file.new_expressions {
        let lower = ne.class_name.to_lowercase();
        if (ne.class_name.contains("Kafka")
            || ne.class_name.contains("Queue")
            || ne.class_name.contains("Client"))
            && (lower.contains("queue") || lower.contains("kafka"))
        {
            return (NodeType::EventBroker, "Event Client");
        }
    }

    (NodeType::BackgroundWorker, "Domain Service")
}

fn build_node(file: &ParsedSourceFile, node_type: NodeType, tech: &str) -> SystemNode {
    let type_label = match node_type {
        NodeType::GatewayApi => "UI Component",
        NodeType::RelationalDatabase => "Database",
        NodeType::EventBroker => "Message Broker",
        NodeType::RestApi => "REST Endpoint",
        _ => "Service",
    };

    let mut node = SystemNode {
        id: sanitize_id(&file.base_name),
        r#type: node_type as i32,
        name: format!("{} {}", file.base_name, type_label),
        external: Some(false),
        properties: None,
        is_test: Some(file.is_test_file),
        x: None,
        y: None,
        entity_ref: None,
    };
    node.set_property_string("technology", tech);
    node.set_property_string("filepath", &file.relative_path);
    node.set_property_string("namespaces", &file.namespaces.join(","));
    node
}

// -- Nodes ------------------------------------------------------------------

pub fn extract_nodes(source_files: &[ParsedSourceFile]) -> HashMap<String, SystemNode> {
    let mut nodes = HashMap::new();

    nodes.insert(
        CLIENT_ID.to_string(),
        SystemNode {
            id: CLIENT_ID.to_string(),
            r#type: NodeType::GatewayApi as i32,
            name: "React Web Application".to_string(),
            ..Default::default()
        },
    );

    for file in source_files {
        let (node_type, tech) = classify(file);
        let node = build_node(file, node_type, tech);
        nodes.insert(node.id.clone(), node);
    }

    nodes
}

// -- Dependencies -----------------------------------------------------------

fn dep_type_for(target: &SystemNode) -> (DependencyType, &'static str) {
    match target.node_type() {
        NodeType::RelationalDatabase => {
            (DependencyType::ReadWrite, "Queries database table records")
        }
        NodeType::EventBroker => (
            DependencyType::PublishSubscribe,
            "Publishes / consumes messaging topics",
        ),
        _ => (
            DependencyType::DirectCall,
            "Executes local class methods / functions",
        ),
    }
}

fn push_dep(
    from: &str,
    to: &str,
    kind: DependencyType,
    desc: &str,
    deps: &mut Vec<SystemDependency>,
    seen: &mut HashMap<(String, String), bool>,
) {
    if seen.contains_key(&(from.to_string(), to.to_string())) {
        return;
    }
    seen.insert((from.to_string(), to.to_string()), true);
    deps.push(SystemDependency {
        from: from.to_string(),
        to: to.to_string(),
        r#type: kind as i32,
        description: Some(desc.to_string()),
    });
}

fn resolve_import_id(specifier: &str) -> String {
    let base = specifier
        .split(&['/', '\\'][..])
        .rfind(|s| !s.is_empty())
        .unwrap_or("");
    let clean = base
        .replace(".ts", "")
        .replace(".tsx", "")
        .replace(".js", "")
        .replace(".jsx", "");
    sanitize_id(&clean)
}

fn resolve_new_expr_id(name: &str, nodes: &HashMap<String, SystemNode>) -> Option<String> {
    let id = sanitize_id(name);
    if nodes.contains_key(&id) {
        return Some(id);
    }
    // C# interface fallback: ISomething -> Something
    if name.starts_with('I') && name.len() > 1 {
        let second = name.chars().nth(1).unwrap();
        if second.is_uppercase() {
            let stripped: String = name.chars().skip(1).collect();
            let fallback = sanitize_id(&stripped);
            if nodes.contains_key(&fallback) {
                return Some(fallback);
            }
        }
    }
    None
}

pub fn extract_dependencies(
    source_files: &[ParsedSourceFile],
    nodes: &mut HashMap<String, SystemNode>,
) -> Vec<SystemDependency> {
    let mut deps = Vec::new();
    let mut seen = HashMap::new();

    for file in source_files {
        let id = sanitize_id(&file.base_name);
        let Some(node) = nodes.get(&id) else {
            continue;
        };
        let node_type = node.node_type();

        // Frontend client edges
        if !file.is_test_file {
            if node_type == NodeType::GatewayApi {
                push_dep(
                    CLIENT_ID,
                    &id,
                    DependencyType::DirectCall,
                    &format!("Renders {} layout component", file.base_name),
                    &mut deps,
                    &mut seen,
                );
            } else if node_type == NodeType::RestApi {
                push_dep(
                    CLIENT_ID,
                    &id,
                    DependencyType::DirectCall,
                    "Hits API routing gateway",
                    &mut deps,
                    &mut seen,
                );
            }
        }

        // External API edges
        for call in &file.call_expressions {
            if call == "fetch" || call.contains("axios.") {
                push_dep(
                    &id,
                    "external-api-target",
                    DependencyType::DirectCall,
                    "HMR outbound query requests",
                    &mut deps,
                    &mut seen,
                );
                nodes
                    .entry("external-api-target".to_string())
                    .or_insert_with(|| {
                        let mut n = SystemNode {
                            id: "external-api-target".to_string(),
                            r#type: NodeType::RestApi as i32,
                            name: "External HTTP API Endpoint".to_string(),
                            external: Some(true),
                            ..Default::default()
                        };
                        n.set_property_string(
                            "description",
                            "Generic outbound web integration endpoints.",
                        );
                        n
                    });
            }
        }

        // Import edges
        for imp in &file.imports {
            let target_id = resolve_import_id(&imp.module_specifier);
            if target_id == id || target_id == "ports" || target_id == "schema" {
                continue;
            }
            let Some(target) = nodes.get(&target_id) else {
                continue;
            };
            let (kind, desc) = dep_type_for(target);
            push_dep(&id, &target_id, kind, desc, &mut deps, &mut seen);
        }

        // Instantiation edges
        for ne in &file.new_expressions {
            let Some(target_id) = resolve_new_expr_id(&ne.class_name, nodes) else {
                continue;
            };
            if target_id == id {
                continue;
            }
            let target = nodes.get(&target_id).unwrap();
            let (kind, desc) = dep_type_for(target);
            push_dep(&id, &target_id, kind, desc, &mut deps, &mut seen);
        }
    }

    // Hardcoded cross-cutting dependency
    if nodes.contains_key("filesync") && nodes.contains_key("ports") {
        push_dep(
            "filesync",
            "ports",
            DependencyType::DirectCall,
            "Implements FileSystemPort interface",
            &mut deps,
            &mut seen,
        );
    }

    deps
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::ports::ParsedNewExpression;

    #[test]
    fn test_extract_nodes_and_dependencies() {
        let source_files = vec![
            ParsedSourceFile {
                file_path: "UserDatabase.ts".to_string(),
                relative_path: "src/infrastructure/UserDatabase.ts".to_string(),
                base_name: "UserDatabase".to_string(),
                is_test_file: false,
                imports: vec![],
                new_expressions: vec![ParsedNewExpression {
                    class_name: "PrismaClient".to_string(),
                }],
                call_expressions: vec![],
                namespaces: vec![],
            },
            ParsedSourceFile {
                file_path: "UserService.ts".to_string(),
                relative_path: "src/domain/UserService.ts".to_string(),
                base_name: "UserService".to_string(),
                is_test_file: false,
                imports: vec![],
                new_expressions: vec![],
                call_expressions: vec!["fetch".to_string()],
                namespaces: vec![],
            },
        ];

        let mut nodes_map = extract_nodes(&source_files);

        assert!(nodes_map.contains_key("userdatabase"));
        assert_eq!(
            nodes_map.get("userdatabase").unwrap().node_type(),
            NodeType::RelationalDatabase
        );

        assert!(nodes_map.contains_key("userservice"));
        assert_eq!(
            nodes_map.get("userservice").unwrap().node_type(),
            NodeType::BackgroundWorker
        );

        let deps = extract_dependencies(&source_files, &mut nodes_map);
        assert!(deps
            .iter()
            .any(|d| d.from == "userservice" && d.to == "external-api-target"));
    }
}
