/**
 * Public JSON Schema hosting for blueprint YAML (GitHub Pages / custom domain).
 * Bump {@link SYSTEM_SCHEMA_MAJOR_VERSION} only for breaking contract changes.
 */
export const SYSTEM_SCHEMA_MAJOR_VERSION = 1;

export const SYSTEM_SCHEMA_PUBLIC_ORIGIN = 'https://blueprint.mzworthington.co.uk';

export function systemSchemaPublicUrl(
  channel: 'latest' | `v${number}` = `v${SYSTEM_SCHEMA_MAJOR_VERSION}`
): string {
  return `${SYSTEM_SCHEMA_PUBLIC_ORIGIN}/schemas/${channel}/blueprint.schema.json`;
}

/** First-line comment so YAML language servers bind the public JSON Schema. */
export function blueprintYamlLanguageServerDirective(
  channel: 'latest' | `v${number}` = `v${SYSTEM_SCHEMA_MAJOR_VERSION}`
): string {
  return `# yaml-language-server: $schema=${systemSchemaPublicUrl(channel)}`;
}
