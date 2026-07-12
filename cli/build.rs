fn main() {
    let mut config = prost_build::Config::new();

    // Derives serde traits on all generated structs
    config.type_attribute(".", "#[derive(serde::Serialize, serde::Deserialize)]");

    // Optional field serialization overrides to skip None values in YAML
    config.field_attribute(
        "blueprint.v1.SystemNode.c4_ref",
        "#[serde(skip_serializing_if = \"Option::is_none\", default)]",
    );
    config.field_attribute(
        "blueprint.v1.SystemNode.external",
        "#[serde(skip_serializing_if = \"Option::is_none\", default)]",
    );
    config.field_attribute(
        "blueprint.v1.SystemNode.is_test",
        "#[serde(skip_serializing_if = \"Option::is_none\", default)]",
    );
    config.field_attribute(
        "blueprint.v1.SystemNode.x",
        "#[serde(skip_serializing_if = \"Option::is_none\", default)]",
    );
    config.field_attribute(
        "blueprint.v1.SystemNode.y",
        "#[serde(skip_serializing_if = \"Option::is_none\", default)]",
    );
    config.field_attribute(
        "blueprint.v1.SystemNode.entity_ref",
        "#[serde(skip_serializing_if = \"Option::is_none\", default)]",
    );
    config.field_attribute(
        "blueprint.v1.SystemDependency.description",
        "#[serde(skip_serializing_if = \"Option::is_none\", default)]",
    );
    config.field_attribute(
        "blueprint.v1.SystemSchema.parent_ref",
        "#[serde(skip_serializing_if = \"Option::is_none\", default)]",
    );

    // Custom serializer mod overrides
    config.field_attribute(
        "blueprint.v1.SystemSchema.level",
        "#[serde(with = \"crate::domain::model::c4_level_serde\")]",
    );
    config.field_attribute(
        "blueprint.v1.SystemNode.type",
        "#[serde(with = \"crate::domain::model::node_type_serde\")]",
    );
    config.field_attribute(
        "blueprint.v1.SystemDependency.type",
        "#[serde(with = \"crate::domain::model::dependency_type_serde\")]",
    );
    config.field_attribute("blueprint.v1.SystemNode.properties", "#[serde(with = \"crate::domain::model::properties_serde\", skip_serializing_if = \"Option::is_none\", default)]");

    config
        .compile_protos(
            &["../core/proto/blueprint/v1/schema.proto"],
            &["../core/proto/"],
        )
        .unwrap();
}
