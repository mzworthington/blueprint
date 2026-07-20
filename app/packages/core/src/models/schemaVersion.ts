/**
 * Public JSON Schema hosting for blueprint YAML (GitHub Pages / custom domain).
 * Bump {@link SYSTEM_SCHEMA_MAJOR_VERSION} only for breaking contract changes.
 */
export const SYSTEM_SCHEMA_MAJOR_VERSION = 3;

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

export type SchemaVersionStatus = 'legacy' | 'newer' | 'unknown';

/** Result when {@link assessSchemaVersion} detects a contract mismatch (null = compatible). */
export type SchemaVersionAssessment = {
  status: SchemaVersionStatus;
  /** Parsed major from a schema URL, or null for legacy semver / unknown strings. */
  loadedMajor: number | null;
  expectedMajor: number;
  loadedVersion: string;
  expectedVersionUrl: string;
  title: string;
  message: string;
  migrationHint: string;
};

function isLegacySemverVersion(version: string): boolean {
  const trimmed = version.trim();
  return /^\d+\.\d+/.test(trimmed) && !trimmed.includes('://') && !/schemas\//i.test(trimmed);
}

/**
 * Extract the schema contract major from a diagram `version` field.
 * Legacy pre-v3 files use semver strings (e.g. `1.0.0`) instead of a schema URL.
 */
export function parseSchemaContractMajor(version: string): number | 'legacy' | null {
  const trimmed = version.trim();
  if (!trimmed) return null;

  if (isLegacySemverVersion(trimmed)) return 'legacy';

  const urlMatch = trimmed.match(/\/schemas\/(?:v(\d+)|latest)\//i);
  if (urlMatch) {
    if (urlMatch[1]) return parseInt(urlMatch[1], 10);
    return SYSTEM_SCHEMA_MAJOR_VERSION;
  }

  const relMatch = trimmed.match(/schemas\/(?:v(\d+)|latest)\//i);
  if (relMatch) {
    if (relMatch[1]) return parseInt(relMatch[1], 10);
    return SYSTEM_SCHEMA_MAJOR_VERSION;
  }

  return null;
}

/**
 * Returns a mismatch assessment when `loadedVersion` is not compatible with the app contract.
 * Compatible: same major as {@link SYSTEM_SCHEMA_MAJOR_VERSION}, or `/schemas/latest/`.
 */
export function assessSchemaVersion(
  loadedVersion: string,
  expectedMajor: number = SYSTEM_SCHEMA_MAJOR_VERSION
): SchemaVersionAssessment | null {
  const expectedVersionUrl = systemSchemaPublicUrl();
  const contract = parseSchemaContractMajor(loadedVersion);

  if (contract === 'legacy') {
    return {
      status: 'legacy',
      loadedMajor: null,
      expectedMajor,
      loadedVersion,
      expectedVersionUrl,
      title: 'Legacy schema format',
      message: `This diagram uses a legacy schema version (${loadedVersion}). Blueprint expects v${expectedMajor}.`,
      migrationHint:
        'Commit pending changes from the designer or re-run the CLI — saves rewrite YAML with the v3 wire format (`metaData` root and a public schema URL in `version`). See docs/setup.md.',
    };
  }

  if (contract === null) {
    return {
      status: 'unknown',
      loadedMajor: null,
      expectedMajor,
      loadedVersion,
      expectedVersionUrl,
      title: 'Unrecognized schema version',
      message: `Could not parse schema version "${loadedVersion}".`,
      migrationHint: `Set version to ${expectedVersionUrl} or add a yaml-language-server $schema directive. See docs/setup.md.`,
    };
  }

  if (contract === expectedMajor) return null;

  if (contract < expectedMajor) {
    return {
      status: 'legacy',
      loadedMajor: contract,
      expectedMajor,
      loadedVersion,
      expectedVersionUrl,
      title: `Schema v${contract}`,
      message: `This diagram targets schema v${contract}; Blueprint expects v${expectedMajor}.`,
      migrationHint:
        'Open the diagram in the designer and commit pending changes, or re-run the CLI to regenerate YAML at the current schema version.',
    };
  }

  return {
    status: 'newer',
    loadedMajor: contract,
    expectedMajor,
    loadedVersion,
    expectedVersionUrl,
    title: `Schema v${contract}`,
    message: `This diagram targets schema v${contract}, which is newer than this Blueprint build (v${expectedMajor}).`,
    migrationHint: 'Upgrade Blueprint to a release that supports this schema version.',
  };
}
