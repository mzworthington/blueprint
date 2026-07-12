use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use crate::domain::analyzer::container::get_container_info;
use crate::domain::analyzer::extractor::{extract_dependencies, extract_nodes};
use crate::domain::analyzer::naming::{get_display_name, get_meaningful_name, sanitize_id};
use crate::domain::model::{
    C4Level, SystemDependency, SystemNode, SystemSchema, WorkspaceHierarchy, WorkspaceManifest,
};
use crate::domain::ports::{FileSystemPort, LayoutPort, LoggerPort, ParserPort};

pub struct CodebaseAnalyzerDependencies {
    pub parser: Arc<dyn ParserPort>,
    pub layout: Arc<dyn LayoutPort>,
    pub file_system: Arc<dyn FileSystemPort>,
    pub logger: Arc<dyn LoggerPort>,
}

pub struct CodebaseAnalyzer {
    parser: Arc<dyn ParserPort>,
    layout: Arc<dyn LayoutPort>,
    file_system: Arc<dyn FileSystemPort>,
    logger: Arc<dyn LoggerPort>,
}

impl CodebaseAnalyzer {
    pub fn new(deps: CodebaseAnalyzerDependencies) -> Self {
        Self {
            parser: deps.parser,
            layout: deps.layout,
            file_system: deps.file_system,
            logger: deps.logger,
        }
    }

    pub fn run_analysis(&self, glob_pattern: &str, output_dir: &str) -> Result<(), String> {
        let source_files = self.parser.parse_source_files(glob_pattern)?;

        let mut nodes_map = extract_nodes(&source_files);
        let dependencies_list = extract_dependencies(&source_files, &mut nodes_map);

        let components: Vec<SystemNode> = nodes_map.values().cloned().collect();
        let meaningful_name =
            get_meaningful_name(self.file_system.as_ref(), &source_files, glob_pattern);
        let system_name = sanitize_id(&meaningful_name);
        let display_name = get_display_name(&meaningful_name);

        self.logger.info(&format!(
            "📊 Extracted {} component nodes and {} dependency edges.",
            components.len(),
            dependencies_list.len()
        ));

        let mut container_nodes_map = HashMap::new();
        let mut container_dependencies_list: Vec<SystemDependency> = Vec::new();

        for node in &components {
            let info = get_container_info(node, node.get_property_string("filepath"));

            if !container_nodes_map.contains_key(&info.id) {
                let mut c_node = SystemNode {
                    id: info.id.clone(),
                    r#type: info.r#type as i32,
                    name: info.name,
                    c4_ref: None,
                    external: Some(false),
                    properties: None,
                    is_test: Some(false),
                    x: None,
                    y: None,
                    entity_ref: None,
                };
                c_node.set_property_string("description", &info.description);
                c_node.set_property_string("technology", &info.technology);

                container_nodes_map.insert(info.id, c_node);
            }
        }

        for edge in &dependencies_list {
            let from_node = nodes_map.get(&edge.from);
            let to_node = nodes_map.get(&edge.to);
            if let (Some(f_node), Some(t_node)) = (from_node, to_node) {
                let from_info = get_container_info(f_node, f_node.get_property_string("filepath"));
                let to_info = get_container_info(t_node, t_node.get_property_string("filepath"));

                if from_info.id != to_info.id {
                    let already_exists = container_dependencies_list
                        .iter()
                        .any(|d| d.from == from_info.id && d.to == to_info.id);
                    if !already_exists {
                        container_dependencies_list.push(SystemDependency {
                            from: from_info.id,
                            to: to_info.id,
                            r#type: edge.r#type,
                            description: Some("Inter-container request / connection".to_string()),
                        });
                    }
                }
            }
        }

        let containers: Vec<SystemNode> = container_nodes_map.values().cloned().collect();
        let layout_containers = self
            .layout
            .compute_layout(containers, container_dependencies_list.clone())?;

        let root_blueprints_dir = if !output_dir.is_empty() {
            self.file_system.get_absolute_path(&[output_dir])
        } else {
            self.file_system.get_absolute_path(&[
                &self.file_system.get_current_working_directory(),
                "blueprints",
            ])
        };

        if !self.file_system.exists(&root_blueprints_dir) {
            self.file_system.mkdir(&root_blueprints_dir)?;
        }

        let blueprints_dir = if !output_dir.is_empty() {
            self.file_system
                .get_absolute_path(&[output_dir, &system_name])
        } else {
            self.file_system
                .get_absolute_path(&[&root_blueprints_dir, &system_name])
        };

        if !self.file_system.exists(&blueprints_dir) {
            self.file_system.mkdir(&blueprints_dir)?;
        }

        let container_schema = SystemSchema {
            name: format!("{} - Container Level", display_name),
            version: "1.0.0".to_string(),
            level: C4Level::Container as i32,
            parent_ref: None,
            nodes: layout_containers,
            dependencies: container_dependencies_list,
        };

        let container_yaml = serde_yaml::to_string(&container_schema)
            .map_err(|e| format!("Failed to serialize container YAML: {}", e))?;

        let container_path = self
            .file_system
            .get_absolute_path(&[&blueprints_dir, "containers.yaml"]);
        self.file_system
            .write_schema(&container_path, &container_yaml)?;
        self.logger.info(&format!(
            "📄 Saved Container-level schema: {}",
            container_path
        ));

        let active_container_ids: Vec<String> = container_nodes_map
            .keys()
            .filter(|id| *id != "external-services" && *id != "frontend-client")
            .cloned()
            .collect();

        for cont_id in &active_container_ids {
            let container_node = container_nodes_map.get(cont_id).unwrap();
            let internal_nodes: Vec<&SystemNode> = components
                .iter()
                .filter(|n| {
                    let info = get_container_info(n, n.get_property_string("filepath"));
                    info.id == *cont_id
                })
                .collect();

            let relevant_edges: Vec<SystemDependency> = dependencies_list
                .iter()
                .filter(|edge| {
                    let from_node = nodes_map.get(&edge.from);
                    let to_node = nodes_map.get(&edge.to);
                    if let (Some(f), Some(t)) = (from_node, to_node) {
                        let from_cont = get_container_info(f, f.get_property_string("filepath")).id;
                        let to_cont = get_container_info(t, t.get_property_string("filepath")).id;
                        from_cont == *cont_id || to_cont == *cont_id
                    } else {
                        false
                    }
                })
                .cloned()
                .collect();

            let mut node_ids = HashSet::new();
            for n in &internal_nodes {
                node_ids.insert(n.id.clone());
            }
            for e in &relevant_edges {
                node_ids.insert(e.from.clone());
                node_ids.insert(e.to.clone());
            }

            let sub_nodes: Vec<SystemNode> = node_ids
                .into_iter()
                .map(|id| {
                    let node = nodes_map.get(&id).unwrap().clone();
                    let info = get_container_info(&node, node.get_property_string("filepath"));
                    let is_external = info.id != *cont_id;

                    SystemNode {
                        id: node.id,
                        r#type: node.r#type,
                        name: if is_external {
                            format!("{} ({})", node.name, info.name)
                        } else {
                            node.name
                        },
                        c4_ref: node.c4_ref,
                        external: Some(node.external.unwrap_or(false) || is_external),
                        properties: node.properties,
                        is_test: node.is_test,
                        x: node.x,
                        y: node.y,
                        entity_ref: node.entity_ref,
                    }
                })
                .collect();

            let layout_sub_nodes = self
                .layout
                .compute_layout(sub_nodes, relevant_edges.clone())?;

            let component_schema = SystemSchema {
                name: format!("{} - {} Components", display_name, container_node.name),
                version: "1.0.0".to_string(),
                level: C4Level::Component as i32,
                parent_ref: Some(format!("{}/{}", system_name, cont_id)),
                nodes: layout_sub_nodes,
                dependencies: relevant_edges,
            };

            let component_yaml = serde_yaml::to_string(&component_schema)
                .map_err(|e| format!("Failed to serialize component YAML: {}", e))?;

            let component_path = self
                .file_system
                .get_absolute_path(&[&blueprints_dir, &format!("{}-components.yaml", cont_id)]);
            self.file_system
                .write_schema(&component_path, &component_yaml)?;
            self.logger.info(&format!(
                "📄 Saved Component-level schema for {}: {}",
                cont_id, component_path
            ));
        }

        let workspace_manifest = WorkspaceManifest {
            name: format!("{} Workspace", display_name),
            root: system_name.clone(),
            hierarchy: vec![WorkspaceHierarchy {
                parent: system_name.clone(),
                children: active_container_ids
                    .iter()
                    .map(|cont_id| format!("{}/{}", system_name, cont_id))
                    .collect(),
            }],
        };

        let manifest_yaml = serde_yaml::to_string(&workspace_manifest)
            .map_err(|e| format!("Failed to serialize manifest YAML: {}", e))?;

        let manifest_path = self
            .file_system
            .get_absolute_path(&[&blueprints_dir, "workspace.yaml"]);
        self.file_system
            .write_schema(&manifest_path, &manifest_yaml)?;
        self.logger.info(&format!(
            "📄 Saved Workspace manifest schema: {}",
            manifest_path
        ));

        self.logger
            .info("✅ Successfully generated visual layout levels!");
        Ok(())
    }
}
