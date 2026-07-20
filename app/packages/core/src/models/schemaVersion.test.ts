import { describe, it, expect } from 'vitest';
import {
  assessSchemaVersion,
  blueprintYamlLanguageServerDirective,
  parseSchemaContractMajor,
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

  it('parses schema contract majors from URLs and legacy semver', () => {
    expect(parseSchemaContractMajor(systemSchemaPublicUrl())).toBe(SYSTEM_SCHEMA_MAJOR_VERSION);
    expect(parseSchemaContractMajor(systemSchemaPublicUrl('latest'))).toBe(
      SYSTEM_SCHEMA_MAJOR_VERSION
    );
    expect(parseSchemaContractMajor('../../schemas/v2/blueprint.schema.json')).toBe(2);
    expect(parseSchemaContractMajor('1.0.0')).toBe('legacy');
    expect(parseSchemaContractMajor('')).toBe(null);
    expect(parseSchemaContractMajor('not-a-version')).toBe(null);
  });

  it('assessSchemaVersion returns null when compatible', () => {
    expect(assessSchemaVersion(systemSchemaPublicUrl())).toBeNull();
    expect(assessSchemaVersion(systemSchemaPublicUrl('latest'))).toBeNull();
  });

  it('assessSchemaVersion flags legacy semver and older majors', () => {
    const legacy = assessSchemaVersion('1.0.0');
    expect(legacy?.status).toBe('legacy');
    expect(legacy?.title).toBe('Legacy schema format');

    const older = assessSchemaVersion(systemSchemaPublicUrl('v2'));
    expect(older?.status).toBe('legacy');
    expect(older?.loadedMajor).toBe(2);
  });

  it('assessSchemaVersion flags newer majors', () => {
    const newer = assessSchemaVersion(systemSchemaPublicUrl('v4'));
    expect(newer?.status).toBe('newer');
    expect(newer?.loadedMajor).toBe(4);
  });

  it('assessSchemaVersion flags unrecognized version strings', () => {
    const unknown = assessSchemaVersion('blueprint-v99');
    expect(unknown?.status).toBe('unknown');
  });

  it('builds a fetchable language-server URL and directive', () => {
    expect(systemSchemaLanguageServerUrl()).toBe(
      `https://raw.githubusercontent.com/mzworthington/blueprint/main/schemas/v${SYSTEM_SCHEMA_MAJOR_VERSION}/blueprint.schema.json`
    );
    expect(blueprintYamlLanguageServerDirective()).toBe(
      `# yaml-language-server: $schema=${systemSchemaLanguageServerUrl()}`
    );
    expect(blueprintYamlLanguageServerDirective('../../schemas/v3/blueprint.schema.json')).toBe(
      '# yaml-language-server: $schema=../../schemas/v3/blueprint.schema.json'
    );
  });
});
