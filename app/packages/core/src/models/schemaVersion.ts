/**
 * Public JSON Schema hosting for blueprint YAML (GitHub Pages / custom domain).
 * Bump {@link SYSTEM_SCHEMA_MAJOR_VERSION} only for breaking contract changes.
 */
export const SYSTEM_SCHEMA_MAJOR_VERSION = 2;

export const SYSTEM_SCHEMA_PUBLIC_ORIGIN = 'https://blueprint.mzworthington.co.uk';

/** Canonical $id / docs URL (GitHub Pages). */
export function systemSchemaPublicUrl(
  channel: 'latest' | `v${number}` = `v${SYSTEM_SCHEMA_MAJOR_VERSION}`
): string {
  return `${SYSTEM_SCHEMA_PUBLIC_ORIGIN}/schemas/${channel}/blueprint.schema.json`;
}

/**
 * Fetchable URL for `# yaml-language-server: $schema=…`.
 * Uses raw.githubusercontent.com so IDEs can load the schema before Pages deploys.
 */
export function systemSchemaLanguageServerUrl(
  channel: 'latest' | `v${number}` = `v${SYSTEM_SCHEMA_MAJOR_VERSION}`
): string {
  return `https://raw.githubusercontent.com/mzworthington/blueprint/main/schemas/${channel}/blueprint.schema.json`;
}

/** First-line comment so YAML language servers bind the JSON Schema. */
export function blueprintYamlLanguageServerDirective(schemaUrl?: string): string {
  return `# yaml-language-server: $schema=${schemaUrl ?? systemSchemaLanguageServerUrl()}`;
}
