import { describe, expect, it } from 'vitest';
import { resolveLiveSchemaUrl } from './resolveLiveSchemaUrl';

describe('resolveLiveSchemaUrl', () => {
  it('defaults empty channel to latest under /', () => {
    expect(resolveLiveSchemaUrl('')).toBe('/schemas/latest/blueprint.schema.json');
    expect(resolveLiveSchemaUrl('  ')).toBe('/schemas/latest/blueprint.schema.json');
  });

  it('accepts latest and versioned channels', () => {
    expect(resolveLiveSchemaUrl('latest')).toBe('/schemas/latest/blueprint.schema.json');
    expect(resolveLiveSchemaUrl('v3')).toBe('/schemas/v3/blueprint.schema.json');
  });

  it('joins with Vite BASE_URL when not root', () => {
    expect(resolveLiveSchemaUrl('latest', '/blueprint/')).toBe(
      '/blueprint/schemas/latest/blueprint.schema.json'
    );
    expect(resolveLiveSchemaUrl('v3', '/blueprint')).toBe(
      '/blueprint/schemas/v3/blueprint.schema.json'
    );
  });

  it('rejects path traversal and unknown channels', () => {
    expect(resolveLiveSchemaUrl('../latest')).toBeNull();
    expect(resolveLiveSchemaUrl('latest/../../etc')).toBeNull();
    expect(resolveLiveSchemaUrl('v3.1')).toBeNull();
    expect(resolveLiveSchemaUrl('main')).toBeNull();
  });
});
