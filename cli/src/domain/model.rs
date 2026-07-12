pub mod pb {
    include!(concat!(env!("OUT_DIR"), "/blueprint.v1.rs"));
}

pub use pb::{
    C4Level, DependencyType, NodeType, SystemDependency, SystemNode, SystemSchema,
    WorkspaceHierarchy, WorkspaceManifest,
};

impl SystemNode {
    pub fn node_type(&self) -> NodeType {
        NodeType::try_from(self.r#type).unwrap_or(NodeType::SoftwareSystem)
    }

    pub fn get_property_string(&self, key: &str) -> Option<&str> {
        self.properties
            .as_ref()
            .and_then(|s| s.fields.get(key))
            .and_then(|v| v.kind.as_ref())
            .and_then(|k| match k {
                prost_types::value::Kind::StringValue(s) => Some(s.as_str()),
                _ => None,
            })
    }

    pub fn get_property_number(&self, key: &str) -> Option<f64> {
        self.properties
            .as_ref()
            .and_then(|s| s.fields.get(key))
            .and_then(|v| v.kind.as_ref())
            .and_then(|k| match k {
                prost_types::value::Kind::NumberValue(n) => Some(*n),
                _ => None,
            })
    }

    pub fn get_property_bool(&self, key: &str) -> Option<bool> {
        self.properties
            .as_ref()
            .and_then(|s| s.fields.get(key))
            .and_then(|v| v.kind.as_ref())
            .and_then(|k| match k {
                prost_types::value::Kind::BoolValue(b) => Some(*b),
                _ => None,
            })
    }

    pub fn set_property_string(&mut self, key: &str, val: &str) {
        let s = self.properties.get_or_insert_with(Default::default);
        s.fields.insert(
            key.to_string(),
            prost_types::Value {
                kind: Some(prost_types::value::Kind::StringValue(val.to_string())),
            },
        );
    }
}

pub mod c4_level_serde {
    use super::pb::C4Level;
    use serde::{self, Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(value: &i32, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let s = match C4Level::try_from(*value).unwrap_or(C4Level::Unspecified) {
            C4Level::Context => "context",
            C4Level::Container => "container",
            C4Level::Component => "component",
            C4Level::Code => "code",
            C4Level::Unspecified => "context",
        };
        serializer.serialize_str(s)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<i32, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let lvl = match s.as_str() {
            "context" => C4Level::Context,
            "container" => C4Level::Container,
            "component" => C4Level::Component,
            "code" => C4Level::Code,
            _ => C4Level::Context,
        };
        Ok(lvl as i32)
    }
}

pub mod node_type_serde {
    use super::pb::NodeType;
    use serde::{self, Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(value: &i32, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let s = match NodeType::try_from(*value).unwrap_or(NodeType::Unspecified) {
            NodeType::Person => "person",
            NodeType::SoftwareSystem => "software-system",
            NodeType::WebApp => "web-app",
            NodeType::MobileApp => "mobile-app",
            NodeType::SinglePageApp => "single-page-app",
            NodeType::Microservice => "microservice",
            NodeType::Database => "database",
            NodeType::CacheStore => "cache-store",
            NodeType::EventBroker => "event-broker",
            NodeType::ServerlessApp => "serverless-app",
            NodeType::Component => "component",
            NodeType::CodeModule => "code-module",
            NodeType::RelationalDatabase => "relational-database",
            NodeType::GrpcService => "grpc-service",
            NodeType::ServerlessFunction => "serverless-function",
            NodeType::RestApi => "rest-api",
            NodeType::GatewayApi => "gateway-api",
            NodeType::BackgroundWorker => "background-worker",
            NodeType::Unspecified => "software-system",
        };
        serializer.serialize_str(s)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<i32, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let nt = match s.as_str() {
            "person" => NodeType::Person,
            "software-system" => NodeType::SoftwareSystem,
            "web-app" => NodeType::WebApp,
            "mobile-app" => NodeType::MobileApp,
            "single-page-app" => NodeType::SinglePageApp,
            "microservice" => NodeType::Microservice,
            "database" => NodeType::Database,
            "cache-store" => NodeType::CacheStore,
            "event-broker" => NodeType::EventBroker,
            "serverless-app" => NodeType::ServerlessApp,
            "component" => NodeType::Component,
            "code-module" => NodeType::CodeModule,
            "relational-database" => NodeType::RelationalDatabase,
            "grpc-service" => NodeType::GrpcService,
            "serverless-function" => NodeType::ServerlessFunction,
            "rest-api" => NodeType::RestApi,
            "gateway-api" => NodeType::GatewayApi,
            "background-worker" => NodeType::BackgroundWorker,
            _ => NodeType::SoftwareSystem,
        };
        Ok(nt as i32)
    }
}

pub mod dependency_type_serde {
    use super::pb::DependencyType;
    use serde::{self, Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(value: &i32, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let s = match DependencyType::try_from(*value).unwrap_or(DependencyType::Unspecified) {
            DependencyType::DirectCall => "direct-call",
            DependencyType::PublishSubscribe => "publish-subscribe",
            DependencyType::ReadWrite => "read-write",
            DependencyType::Unspecified => "direct-call",
        };
        serializer.serialize_str(s)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<i32, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let dt = match s.as_str() {
            "direct-call" => DependencyType::DirectCall,
            "publish-subscribe" => DependencyType::PublishSubscribe,
            "read-write" => DependencyType::ReadWrite,
            _ => DependencyType::DirectCall,
        };
        Ok(dt as i32)
    }
}

pub mod properties_serde {
    use prost_types::value::Kind;
    use serde::{self, Deserialize, Deserializer, Serialize, Serializer};
    use std::collections::{BTreeMap, HashMap};

    #[derive(Serialize, Deserialize)]
    #[serde(untagged)]
    pub enum PropValue {
        String(String),
        Number(f64),
        Bool(bool),
    }

    pub fn serialize<S>(
        value: &Option<prost_types::Struct>,
        serializer: S,
    ) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if let Some(s) = value {
            let mut map = BTreeMap::new();
            for (k, v) in &s.fields {
                if let Some(ref kind) = v.kind {
                    match kind {
                        Kind::StringValue(s) => {
                            map.insert(k.clone(), PropValue::String(s.clone()));
                        }
                        Kind::NumberValue(n) => {
                            map.insert(k.clone(), PropValue::Number(*n));
                        }
                        Kind::BoolValue(b) => {
                            map.insert(k.clone(), PropValue::Bool(*b));
                        }
                        _ => {}
                    }
                }
            }
            map.serialize(serializer)
        } else {
            serializer.serialize_none()
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<prost_types::Struct>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let map = Option::<HashMap<String, PropValue>>::deserialize(deserializer)?;
        if let Some(m) = map {
            let mut fields = BTreeMap::new();
            for (k, v) in m {
                let kind = match v {
                    PropValue::String(s) => Some(Kind::StringValue(s)),
                    PropValue::Number(n) => Some(Kind::NumberValue(n)),
                    PropValue::Bool(b) => Some(Kind::BoolValue(b)),
                };
                fields.insert(k, prost_types::Value { kind });
            }
            Ok(Some(prost_types::Struct { fields }))
        } else {
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_c4_level_conversions() {
        let levels = [
            C4Level::Context,
            C4Level::Container,
            C4Level::Component,
            C4Level::Code,
        ];
        for level in levels {
            let roundtrip = C4Level::try_from(level as i32).unwrap();
            assert_eq!(level, roundtrip);
        }
    }

    #[test]
    fn test_node_type_conversions() {
        let types = [
            NodeType::Person,
            NodeType::SoftwareSystem,
            NodeType::WebApp,
            NodeType::Database,
            NodeType::RestApi,
        ];
        for nt in types {
            let roundtrip = NodeType::try_from(nt as i32).unwrap();
            assert_eq!(nt, roundtrip);
        }
    }

    #[test]
    fn test_dependency_type_conversions() {
        let types = [
            DependencyType::DirectCall,
            DependencyType::PublishSubscribe,
            DependencyType::ReadWrite,
        ];
        for dt in types {
            let roundtrip = DependencyType::try_from(dt as i32).unwrap();
            assert_eq!(dt, roundtrip);
        }
    }

    #[test]
    fn test_system_node_properties() {
        let mut node = SystemNode::default();
        node.set_property_string("description", "Test DB");

        assert_eq!(node.get_property_string("description"), Some("Test DB"));
        assert_eq!(node.get_property_string("non_existent"), None);
    }
}
