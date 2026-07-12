use crate::domain::model::{NodeType, SystemDependency, SystemNode};
use crate::domain::ports::LayoutPort;
use std::collections::{HashMap, HashSet};

#[derive(Default)]
pub struct SimpleGridLayoutAdapter;

impl SimpleGridLayoutAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl LayoutPort for SimpleGridLayoutAdapter {
    fn compute_layout(
        &self,
        nodes: Vec<SystemNode>,
        dependencies: Vec<SystemDependency>,
    ) -> Result<Vec<SystemNode>, String> {
        if nodes.is_empty() {
            return Ok(vec![]);
        }

        let mut dep_graph: HashMap<String, Vec<String>> = HashMap::new();
        for dep in &dependencies {
            dep_graph
                .entry(dep.from.clone())
                .or_default()
                .push(dep.to.clone());
        }

        // Logical left-to-right architecture flow
        let type_order: Vec<i32> = vec![
            NodeType::GatewayApi as i32,
            NodeType::RestApi as i32,
            NodeType::BackgroundWorker as i32,
            NodeType::RelationalDatabase as i32,
            NodeType::EventBroker as i32,
            NodeType::SoftwareSystem as i32,
        ];

        let mut groups: HashMap<i32, Vec<SystemNode>> = HashMap::new();
        for node in nodes {
            groups.entry(node.r#type).or_default().push(node);
        }

        let col_width = 320.0;
        let row_height = 200.0;
        let margin = 100.0;

        let mut result = Vec::new();

        // Each type gets its own column, sorted left-to-right by architectural layer
        for (col_idx, &node_type) in type_order.iter().enumerate() {
            let mut group = groups.remove(&node_type).unwrap_or_default();
            group = topological_sort(&group, &dep_graph);

            for (row_idx, mut node) in group.into_iter().enumerate() {
                node.x = Some((col_idx as f64 * col_width + margin).round());
                node.y = Some((row_idx as f64 * row_height + margin).round());
                result.push(node);
            }
        }

        // Any remaining types go to an extra column
        let extra_col_x = type_order.len() as f64 * col_width + margin;
        for (_, mut group) in groups {
            if group.is_empty() {
                continue;
            }
            group = topological_sort(&group, &dep_graph);
            for (row_idx, mut node) in group.into_iter().enumerate() {
                node.x = Some(extra_col_x.round());
                node.y = Some((row_idx as f64 * row_height + margin).round());
                result.push(node);
            }
        }

        Ok(result)
    }
}

fn topological_sort(
    nodes: &[SystemNode],
    dep_graph: &HashMap<String, Vec<String>>,
) -> Vec<SystemNode> {
    if nodes.len() <= 1 {
        return nodes.to_vec();
    }

    let node_ids: HashSet<&str> = nodes.iter().map(|n| n.id.as_str()).collect();

    let mut in_degree: HashMap<String, usize> = HashMap::new();
    let mut adj: HashMap<String, Vec<String>> = HashMap::new();

    for node in nodes {
        in_degree.entry(node.id.clone()).or_insert(0);
        adj.entry(node.id.clone()).or_default();
    }

    // Only keep edges within this group
    for (from, tos) in dep_graph {
        if node_ids.contains(from.as_str()) {
            for to in tos {
                if node_ids.contains(to.as_str()) {
                    adj.entry(from.clone()).or_default().push(to.clone());
                    *in_degree.entry(to.clone()).or_insert(0) += 1;
                }
            }
        }
    }

    // Kahn's algorithm — sorted queue for determinism
    let mut queue: Vec<String> = in_degree
        .iter()
        .filter(|(_, &deg)| deg == 0)
        .map(|(id, _)| id.clone())
        .collect();
    queue.sort();

    let mut sorted_ids = Vec::new();
    while !queue.is_empty() {
        let current = queue.remove(0);
        sorted_ids.push(current.clone());
        if let Some(neighbors) = adj.get(&current) {
            let mut sorted_neighbors = neighbors.clone();
            sorted_neighbors.sort();
            for neighbor in sorted_neighbors {
                if let Some(deg) = in_degree.get_mut(&neighbor) {
                    *deg -= 1;
                    if *deg == 0 {
                        queue.push(neighbor);
                        queue.sort();
                    }
                }
            }
        }
    }

    // Cycles or disconnected: fill in remaining alphabetically
    if sorted_ids.len() < nodes.len() {
        let sorted_set: HashSet<&str> = sorted_ids.iter().map(|s| s.as_str()).collect();
        let mut remaining: Vec<String> = nodes
            .iter()
            .map(|n| n.id.clone())
            .filter(|id| !sorted_set.contains(id.as_str()))
            .collect();
        remaining.sort();
        sorted_ids.extend(remaining);
    }

    let node_map: HashMap<&str, &SystemNode> = nodes.iter().map(|n| (n.id.as_str(), n)).collect();
    sorted_ids
        .iter()
        .filter_map(|id| node_map.get(id.as_str()).map(|n| (*n).clone()))
        .collect()
}
