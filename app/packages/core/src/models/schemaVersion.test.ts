import { describe, it, expect } from 'vitest';
import {
  blueprintYamlLanguageServerDirective,
  systemSchemaPublicUrl,
  SYSTEM_SCHEMA_MAJOR_VERSION,
} from './schemaVersion';

describe('schemaVersion', () => {
  it('builds versioned and latest public URLs', () => {
    expect(systemSchemaPublicUrl()).toBe(
      `https://blueprint.mzworthington.co.uk/schemas/v${SYSTEM_SCHEMA_MAJOR_VERSION}/blueprint.schema.json`
    );
    expect(systemSchemaPublicUrl('latest')).toBe(
      'https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json'
    );
  });

  it('builds the yaml-language-server directive for IDE binding', () => {
    expect(blueprintYamlLanguageServerDirective()).toBe(
      `# yaml-language-server: $schema=${systemSchemaPublicUrl()}`
    );
  });
});
