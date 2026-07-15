import { describe, expect, it } from 'vitest';
import { resolveDocsAssetSrc, resolveDocsHref } from './pages';

describe('docs link resolution', () => {
  it('resolves relative markdown links within the guide', () => {
    expect(resolveDocsHref('./getting-started.md', 'guide')).toBe('/guide/getting-started');
    expect(resolveDocsHref('./canvas.md', 'guide')).toBe('/guide/canvas');
    expect(resolveDocsHref('../setup.md', 'guide')).toBe('/setup');
  });

  it('resolves absolute docs paths', () => {
    expect(resolveDocsHref('/guide/', '')).toBe('/guide');
    expect(resolveDocsHref('/setup', '')).toBe('/setup');
  });

  it('resolves in-app workspace links', () => {
    expect(resolveDocsHref('/workspace', '')).toBe('/workspace');
  });

  it('maps screenshot assets under /docs-assets', () => {
    expect(resolveDocsAssetSrc('./screenshots/1-panels-expanded.png', '')).toBe(
      '/docs-assets/screenshots/1-panels-expanded.png'
    );
  });
});
