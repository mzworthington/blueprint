fn main() {
    // Quarantine: this crate is unmaintained. Prefer the TypeScript CLI.
    // Set BLUEPRINT_RUST_ALLOW_BUILD=1 only if you intentionally restore protos.
    if std::env::var_os("BLUEPRINT_RUST_ALLOW_BUILD").is_none() {
        panic!(
            "\n\n\
blueprint-rust is UNMAINTAINED and not part of CI.\n\
Use the TypeScript CLI instead:\n\
  cd app && pnpm dev:cli\n\
See cli/README.md and app/packages/cli/README.md.\n\
To force this experimental build (after restoring core/proto), set:\n\
  BLUEPRINT_RUST_ALLOW_BUILD=1\n"
        );
    }

    let mut config = prost_build::Config::new();

    // Derives serde traits on all generated structs
    config.type_attribute(
        ".",
        "#[derive(serde::Serialize, serde::Deserialize)]\n#[serde(rename_all = \"camelCase\")]",
    );

    // Optional field serialization overrides to skip None values in YAML
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
        "blueprint.v1.SystemDependency.description",
        "#[serde(skip_serializing_if = \"Option::is_none\", default)]",
    );
    config.field_attribute(
        "blueprint.v1.SystemSchema.id",
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
        .unwrap_or_else(|err| {
            panic!(
                "prost compile failed ({err}). Protos were removed from the repo — use @blueprint/cli."
            )
        });
}
