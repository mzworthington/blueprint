use crate::domain::analyzer::naming::sanitize_id;
use crate::domain::model::{DependencyType, NodeType, SystemDependency, SystemNode};
use crate::domain::ports::ParsedSourceFile;
use std::collections::HashMap;

pub fn extract_nodes(source_files: &[ParsedSourceFile]) -> HashMap<String, SystemNode> {
    let mut nodes_map = HashMap::new();

    let client_node_id = "frontend-client";
    nodes_map.insert(
        client_node_id.to_string(),
        SystemNode {
            id: client_node_id.to_string(),
            r#type: NodeType::GatewayApi as i32,
            name: "React Web Application".to_string(),
            c4_ref: None,
            external: Some(false),
            properties: None,
            is_test: Some(false),
            x: None,
            y: None,
            entity_ref: None,
        },
    );

    for source_file in source_files {
        let clean_file_id = sanitize_id(&source_file.base_name);
        let is_test_file = source_file.is_test_file;

        if clean_file_id == "app" || clean_file_id == "main" {
            continue;
        }

        let mut is_react_component = false;
        let mut is_database = false;
        let mut is_event_broker = false;
        let mut is_api_server = false;

        for imp in &source_file.imports {
            let ms = &imp.module_specifier;
            if ms.contains("react") || ms.contains("@xyflow/react") {
                is_react_component = true;
            }
            if ms.contains("prisma")
                || ms.contains("knex")
                || ms.contains("pg")
                || ms.contains("mongodb")
            {
                is_database = true;
            }
            if ms.contains("kafkajs")
                || ms.contains("bullmq")
                || ms.contains("amqplib")
                || ms.contains("mqtt")
            {
                is_event_broker = true;
            }
            if ms.contains("express") || ms.contains("fastify") || ms.contains("@nestjs/common") {
                is_api_server = true;
            }
        }

        for new_expr in &source_file.new_expressions {
            let cn = &new_expr.class_name;
            if cn.contains("PrismaClient") || cn.contains("MongoClient") {
                is_database = true;
            }
            if (cn.contains("Kafka") || cn.contains("Queue") || cn.contains("Client"))
                && (cn.to_lowercase().contains("queue") || cn.to_lowercase().contains("kafka"))
            {
                is_event_broker = true;
            }
        }

        let file_ext = source_file
            .relative_path
            .split('.')
            .next_back()
            .unwrap_or("")
            .to_lowercase();
        let mut lang_prefix = "TypeScript";
        if file_ext == "cs" {
            lang_prefix = "C#";
        } else if file_ext == "py" {
            lang_prefix = "Python";
        } else if file_ext == "js" || file_ext == "jsx" {
            lang_prefix = "JavaScript";
        }

        let mut node = SystemNode {
            id: clean_file_id.clone(),
            c4_ref: None,
            external: Some(false),
            properties: None,
            is_test: Some(is_test_file),
            x: None,
            y: None,
            entity_ref: None,
            ..Default::default()
        };

        if is_react_component {
            let tech = if file_ext == "cs" {
                "C# Razor/Blazor Component"
            } else if lang_prefix == "TypeScript" || lang_prefix == "JavaScript" {
                "React Component"
            } else {
                "UI Component"
            };
            node.r#type = NodeType::GatewayApi as i32;
            node.name = format!("{} UI Component", source_file.base_name);
            node.set_property_string("technology", tech);
        } else if is_database {
            let tech = if file_ext == "cs" {
                "Entity Framework / DB Context"
            } else if file_ext == "py" {
                "SQLAlchemy / DB Client"
            } else {
                "Prisma / SQL Database Client"
            };
            node.r#type = NodeType::RelationalDatabase as i32;
            node.name = format!("{} Database", source_file.base_name);
            node.set_property_string("technology", tech);
        } else if is_event_broker {
            node.r#type = NodeType::EventBroker as i32;
            node.name = format!("{} Message Broker", source_file.base_name);
            node.set_property_string("technology", &format!("{} Event Client", lang_prefix));
        } else if is_api_server {
            let tech = if file_ext == "cs" {
                "ASP.NET Core Controller / Minimal API"
            } else if file_ext == "py" {
                "FastAPI / Flask Router"
            } else {
                "REST Controller / Router"
            };
            node.r#type = NodeType::RestApi as i32;
            node.name = format!("{} REST Endpoint", source_file.base_name);
            node.set_property_string("technology", tech);
        } else {
            node.r#type = NodeType::BackgroundWorker as i32;
            node.name = format!("{} Service", source_file.base_name);
            node.set_property_string("technology", &format!("{} Domain Service", lang_prefix));
        }

        node.set_property_string("filepath", &source_file.relative_path);
        node.set_property_string("namespaces", &source_file.namespaces.join(","));

        nodes_map.insert(clean_file_id, node);
    }

    nodes_map
}

pub fn extract_dependencies(
    source_files: &[ParsedSourceFile],
    nodes_map: &mut HashMap<String, SystemNode>,
) -> Vec<SystemDependency> {
    let mut dependencies_list = Vec::new();
    let client_node_id = "frontend-client";

    for source_file in source_files {
        let clean_file_id = sanitize_id(&source_file.base_name);
        let is_test_file = source_file.is_test_file;

        if clean_file_id == "app" || clean_file_id == "main" {
            continue;
        }

        let node = match nodes_map.get(&clean_file_id) {
            Some(n) => n.clone(),
            None => continue,
        };

        // React components and APIs get triggered by frontend client if not test files
        if node.node_type() == NodeType::GatewayApi && !is_test_file {
            dependencies_list.push(SystemDependency {
                from: client_node_id.to_string(),
                to: clean_file_id.clone(),
                r#type: DependencyType::DirectCall as i32,
                description: Some(format!(
                    "Renders {} layout component",
                    source_file.base_name
                )),
            });
        } else if node.node_type() == NodeType::RestApi && !is_test_file {
            dependencies_list.push(SystemDependency {
                from: client_node_id.to_string(),
                to: clean_file_id.clone(),
                r#type: DependencyType::DirectCall as i32,
                description: Some("Hits API routing gateway".to_string()),
            });
        }

        // Scan references/calls
        for call_text in &source_file.call_expressions {
            if call_text == "fetch" || call_text.contains("axios.") {
                dependencies_list.push(SystemDependency {
                    from: clean_file_id.clone(),
                    to: "external-api-target".to_string(),
                    r#type: DependencyType::DirectCall as i32,
                    description: Some("HMR outbound query requests".to_string()),
                });

                let mut ext_node = SystemNode {
                    id: "external-api-target".to_string(),
                    r#type: NodeType::RestApi as i32,
                    name: "External HTTP API Endpoint".to_string(),
                    c4_ref: None,
                    external: Some(true),
                    properties: None,
                    is_test: Some(false),
                    x: None,
                    y: None,
                    entity_ref: None,
                };
                ext_node.set_property_string(
                    "description",
                    "Generic outbound web integration endpoints.",
                );
                nodes_map.insert("external-api-target".to_string(), ext_node);
            }
        }

        // Scanned imports
        let source_import_file_names: Vec<String> = source_file
            .imports
            .iter()
            .map(|imp| {
                let parts: Vec<&str> = imp
                    .module_specifier
                    .split(&['/', '\\'][..])
                    .filter(|s| !s.is_empty())
                    .collect();
                let base = parts.last().cloned().unwrap_or("");
                let clean = base
                    .replace(".ts", "")
                    .replace(".tsx", "")
                    .replace(".js", "")
                    .replace(".jsx", "");
                sanitize_id(&clean)
            })
            .filter(|s| !s.is_empty())
            .collect();

        for import_id in source_import_file_names {
            if !import_id.is_empty() && import_id != clean_file_id {
                let already_exists = dependencies_list
                    .iter()
                    .any(|d| d.from == clean_file_id && d.to == import_id);
                if !already_exists && import_id != "ports" && import_id != "schema" {
                    let mut edge_type = DependencyType::DirectCall;
                    let mut desc = "Executes local class methods / functions".to_string();

                    if let Some(target_node) = nodes_map.get(&import_id) {
                        if target_node.node_type() == NodeType::RelationalDatabase {
                            edge_type = DependencyType::ReadWrite;
                            desc = "Queries database table records".to_string();
                        } else if target_node.node_type() == NodeType::EventBroker {
                            edge_type = DependencyType::PublishSubscribe;
                            desc = "Publishes / consumes messaging topics".to_string();
                        }

                        dependencies_list.push(SystemDependency {
                            from: clean_file_id.clone(),
                            to: import_id,
                            r#type: edge_type as i32,
                            description: Some(desc),
                        });
                    }
                }
            }
        }

        // Scanned type instantiations
        for new_expr in &source_file.new_expressions {
            let mut class_name = new_expr.class_name.clone();
            let mut target_id = sanitize_id(&class_name);
            let mut target_node = nodes_map.get(&target_id);

            // C# interface resolution fallback
            if target_node.is_none() && class_name.starts_with('I') && class_name.len() > 1 {
                let second_char = class_name.chars().nth(1).unwrap();
                if second_char.is_uppercase() {
                    class_name = class_name.chars().skip(1).collect();
                    target_id = sanitize_id(&class_name);
                    target_node = nodes_map.get(&target_id);
                }
            }

            if target_node.is_some() && target_id != clean_file_id {
                let already_exists = dependencies_list
                    .iter()
                    .any(|d| d.from == clean_file_id && d.to == target_id);
                if !already_exists {
                    let mut edge_type = DependencyType::DirectCall;
                    let mut desc = "References class type / calls methods".to_string();

                    if let Some(tn) = target_node {
                        if tn.node_type() == NodeType::RelationalDatabase {
                            edge_type = DependencyType::ReadWrite;
                            desc = "Queries database table records".to_string();
                        } else if tn.node_type() == NodeType::EventBroker {
                            edge_type = DependencyType::PublishSubscribe;
                            desc = "Publishes / consumes messaging topics".to_string();
                        }
                    }

                    dependencies_list.push(SystemDependency {
                        from: clean_file_id.clone(),
                        to: target_id,
                        r#type: edge_type as i32,
                        description: Some(desc),
                    });
                }
            }
        }
    }

    if nodes_map.contains_key("filesync") && nodes_map.contains_key("ports") {
        dependencies_list.push(SystemDependency {
            from: "filesync".to_string(),
            to: "ports".to_string(),
            r#type: DependencyType::DirectCall as i32,
            description: Some("Implements FileSystemPort interface".to_string()),
        });
    }

    dependencies_list
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

        // Assert node classifications
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

        // Assert dependencies mapping
        let deps = extract_dependencies(&source_files, &mut nodes_map);
        assert!(deps
            .iter()
            .any(|d| d.from == "userservice" && d.to == "external-api-target"));
    }
}
