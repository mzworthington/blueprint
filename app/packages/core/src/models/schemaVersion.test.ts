import { describe, it, expect } from 'vitest';
import {
  blueprintYamlLanguageServerDirective,
  systemSchemaLanguageServerUrl,
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

  it('builds a fetchable language-server URL and directive', () => {
    expect(systemSchemaLanguageServerUrl()).toBe(
      `https://raw.githubusercontent.com/mzworthington/blueprint/main/schemas/v${SYSTEM_SCHEMA_MAJOR_VERSION}/blueprint.schema.json`
    );
    expect(blueprintYamlLanguageServerDirective()).toBe(
      `# yaml-language-server: $schema=${systemSchemaLanguageServerUrl()}`
    );
    expect(blueprintYamlLanguageServerDirective('../../schemas/v2/blueprint.schema.json')).toBe(
      '# yaml-language-server: $schema=../../schemas/v2/blueprint.schema.json'
    );
  });
});
