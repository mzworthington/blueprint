use crate::domain::analyzer::naming::sanitize_id;
use crate::domain::model::{NodeType, SystemNode};

pub struct ContainerInfo {
    pub id: String,
    pub name: String,
    pub r#type: NodeType,
    pub description: String,
    pub technology: String,
}

pub fn get_container_info(node: &SystemNode, filepath: Option<&str>) -> ContainerInfo {
    let file_ext = filepath
        .and_then(|f| std::path::Path::new(f).extension())
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if node.id == "external-api-target" {
        return ContainerInfo {
            id: "external-services".to_string(),
            name: "External HTTP Services".to_string(),
            r#type: NodeType::SoftwareSystem,
            description: "Outbound HTTP integration endpoints.".to_string(),
            technology: "Web APIs".to_string(),
        };
    }
    if node.id == "frontend-client" {
        return ContainerInfo {
            id: "frontend-client".to_string(),
            name: "Frontend Client Host".to_string(),
            r#type: NodeType::GatewayApi,
            description: "Vite app hosting server.".to_string(),
            technology: "Vite + React".to_string(),
        };
    }

    let filepath = match filepath {
        None => {
            return ContainerInfo {
                id: "app-host".to_string(),
                name: "Application Shell".to_string(),
                r#type: NodeType::GatewayApi,
                description: "Entrypoint and root shell layout.".to_string(),
                technology: if file_ext == "cs" {
                    "C# / .NET".to_string()
                } else if file_ext == "py" {
                    "Python".to_string()
                } else {
                    "Vite / React".to_string()
                },
            };
        }
        Some(f) => f,
    };

    let normalized = filepath.replace('\\', "/");

    if normalized.starts_with("packages/core/") || normalized.starts_with("src/domain/") {
        return ContainerInfo {
            id: "domain-logic".to_string(),
            name: "Domain Logic Layer".to_string(),
            r#type: NodeType::BackgroundWorker,
            description: "Core domain logic, schema validation rules, and graph parsing."
                .to_string(),
            technology: "TypeScript".to_string(),
        };
    }

    if normalized.starts_with("packages/app/src/infrastructure/")
        || normalized.starts_with("packages/app/src/application/")
        || normalized.starts_with("packages/app/src/store/")
        || normalized.starts_with("packages/app/src/adapters/")
        || normalized.starts_with("src/infrastructure/")
        || normalized.starts_with("src/application/")
        || normalized.starts_with("src/adapters/")
        || normalized.starts_with("src/store/")
    {
        let is_state_or_sync = normalized.contains("store")
            || normalized.contains("fileSync")
            || normalized.contains("telemetry")
            || normalized.contains("fileSystem")
            || normalized.contains("logging");
        if is_state_or_sync {
            return ContainerInfo {
                id: "state-sync".to_string(),
                name: "State & Sync Manager".to_string(),
                r#type: NodeType::CacheStore,
                description: "Zustand global store and local directory synchronization."
                    .to_string(),
                technology: "Zustand / Filesystem API".to_string(),
            };
        } else {
            return ContainerInfo {
                id: "frontend-ui".to_string(),
                name: "Frontend React UI".to_string(),
                r#type: NodeType::GatewayApi,
                description: "React Flow canvas, sidebar configuration panel, and navigation UI."
                    .to_string(),
                technology: "React + TailwindCSS".to_string(),
            };
        }
    }

    if normalized.starts_with("packages/app/src/ui/")
        || normalized.starts_with("packages/app/src/components/")
        || normalized.starts_with("packages/app/src/pages/")
        || normalized.starts_with("src/ui/")
        || normalized.starts_with("src/components/")
        || normalized.starts_with("src/pages/")
    {
        return ContainerInfo {
            id: "frontend-ui".to_string(),
            name: "Frontend React UI".to_string(),
            r#type: NodeType::GatewayApi,
            description: "React Flow canvas, sidebar configuration panel, and navigation UI."
                .to_string(),
            technology: "React + TailwindCSS".to_string(),
        };
    }

    let namespaces_str = node
        .get_property_string("namespaces")
        .map(|s| s.to_string());
    let namespaces: Vec<&str> = namespaces_str
        .as_ref()
        .map(|s| s.split(',').filter(|x| !x.is_empty()).collect())
        .unwrap_or_default();

    let mut container_name = String::new();
    let mut container_id = String::new();

    if !namespaces.is_empty() {
        let primary_namespace = namespaces[0];
        let parts: Vec<&str> = primary_namespace.split('.').collect();
        let segment = parts
            .iter()
            .take(std::cmp::min(parts.len(), 2))
            .cloned()
            .collect::<Vec<&str>>()
            .join(".");
        if !segment.is_empty() && segment != "System" && segment != "Microsoft" {
            container_name = segment.clone();
            container_id = sanitize_id(&segment);
        }
    }

    if container_id.is_empty() {
        let parts: Vec<&str> = normalized.split('/').collect();
        let src_index = parts.iter().position(|&x| x == "src");
        let mut folder_name = String::new();
        if let Some(idx) = src_index {
            if parts.len() > idx + 1 {
                folder_name = parts[idx + 1].to_string();
            }
        } else if parts.len() > 2 {
            folder_name = parts[parts.len() - 2].to_string();
        }

        if !folder_name.is_empty() && folder_name != "src" {
            container_name = folder_name.clone();
            container_id = sanitize_id(&folder_name);
        }
    }

    if !container_id.is_empty() {
        let is_api = container_id.ends_with("api")
            || container_id.contains("controller")
            || container_id.contains("server");
        let container_type = if is_api {
            NodeType::GatewayApi
        } else {
            NodeType::BackgroundWorker
        };
        let desc = if is_api {
            format!("REST API endpoints for {}", container_name)
        } else {
            format!("Core domain services for {}", container_name)
        };

        return ContainerInfo {
            id: container_id,
            name: container_name,
            r#type: container_type,
            description: desc,
            technology: if file_ext == "cs" {
                "C# / .NET".to_string()
            } else if file_ext == "py" {
                "Python".to_string()
            } else {
                "TypeScript / Node.js".to_string()
            },
        };
    }

    // Universal fallback container
    ContainerInfo {
        id: "app-host".to_string(),
        name: "Application Shell".to_string(),
        r#type: NodeType::GatewayApi,
        description: "Entrypoint and root shell layout.".to_string(),
        technology: if file_ext == "cs" {
            "C# / .NET".to_string()
        } else if file_ext == "py" {
            "Python".to_string()
        } else {
            "Node.js".to_string()
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_container_info_special_ids() {
        let ext_node = SystemNode {
            id: "external-api-target".to_string(),
            r#type: NodeType::RestApi as i32,
            name: "External API".to_string(),
            c4_ref: None,
            external: Some(true),
            properties: None,
            is_test: Some(false),
            x: None,
            y: None,
            entity_ref: None,
        };
        let info = get_container_info(&ext_node, None);
        assert_eq!(info.id, "external-services");
        assert_eq!(info.r#type, NodeType::SoftwareSystem);

        let client_node = SystemNode {
            id: "frontend-client".to_string(),
            r#type: NodeType::GatewayApi as i32,
            name: "React".to_string(),
            c4_ref: None,
            external: Some(false),
            properties: None,
            is_test: Some(false),
            x: None,
            y: None,
            entity_ref: None,
        };
        let info2 = get_container_info(&client_node, None);
        assert_eq!(info2.id, "frontend-client");
        assert_eq!(info2.r#type, NodeType::GatewayApi);
    }

    #[test]
    fn test_get_container_info_filepath_heuristics() {
        let node = SystemNode {
            id: "my-node".to_string(),
            r#type: NodeType::BackgroundWorker as i32,
            name: "My Node".to_string(),
            c4_ref: None,
            external: Some(false),
            properties: None,
            is_test: Some(false),
            x: None,
            y: None,
            entity_ref: None,
        };

        // Core path
        let info = get_container_info(&node, Some("packages/core/src/rules/graph.ts"));
        assert_eq!(info.id, "domain-logic");
        assert_eq!(info.name, "Domain Logic Layer");

        // App store/sync path
        let info2 = get_container_info(&node, Some("packages/app/src/store/states/ioState.ts"));
        assert_eq!(info2.id, "state-sync");

        // App frontend UI path
        let info3 = get_container_info(
            &node,
            Some("packages/app/src/ui/components/MermaidPreview.tsx"),
        );
        assert_eq!(info3.id, "frontend-ui");
    }
}
