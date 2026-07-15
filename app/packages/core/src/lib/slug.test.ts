import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('Slug utility tests', () => {
  it('should convert workspace names to clean URL slugs', () => {
    expect(slugify('My Super Cool Workspace')).toBe('my-super-cool-workspace');
    expect(slugify('  Trim Spaces  ')).toBe('trim-spaces');
    expect(slugify('Special@Chars!Workspace')).toBe('specialcharsworkspace');
    expect(slugify('Multiple---Hyphens')).toBe('multiple-hyphens');
  });
});
