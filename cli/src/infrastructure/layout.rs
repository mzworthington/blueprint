use crate::domain::model::{SystemDependency, SystemNode};
use crate::domain::ports::LayoutPort;

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
        _dependencies: Vec<SystemDependency>,
    ) -> Result<Vec<SystemNode>, String> {
        let is_container_level = nodes.iter().any(|n| {
            n.id == "domain-logic"
                || n.id == "state-sync"
                || n.id == "frontend-ui"
                || n.id == "app-host"
        });

        let cols = if is_container_level { 3 } else { 4 };
        let col_width = if is_container_level { 380.0 } else { 320.0 };
        let row_height = if is_container_level { 240.0 } else { 200.0 };

        // Sort nodes by ID for deterministic layout sorting
        let mut sorted_nodes = nodes;
        sorted_nodes.sort_by(|a, b| a.id.cmp(&b.id));

        let mapped = sorted_nodes
            .into_iter()
            .enumerate()
            .map(|(idx, mut node)| {
                let row = (idx as f64 / cols as f64).floor();
                let col = idx as f64 % cols as f64;

                node.x = Some((col * col_width + 100.0).round());
                node.y = Some((row * row_height + 100.0).round());
                node
            })
            .collect();

        Ok(mapped)
    }
}
