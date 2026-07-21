import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { parseBuildIdFromHtml, formatAppVersionLabel } from './buildId';

describe('parseBuildIdFromHtml', () => {
  it('reads app-build-id meta tag from html', () => {
    const html = `<!doctype html><html><head>
      <meta name="app-build-id" content="abc123def456" />
    </head></html>`;
    expect(parseBuildIdFromHtml(html)).toBe('abc123def456');
  });

  it('returns null when meta tag is missing', () => {
    expect(parseBuildIdFromHtml('<html><head></head></html>')).toBeNull();
  });
});

describe('formatAppVersionLabel', () => {
  beforeEach(() => {
    vi.stubGlobal('__APP_PACKAGE_VERSION__', '0.1.0');
    vi.stubGlobal('__APP_BUILD_ID__', 'abc123def456');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('formats major.minor from package version plus build id', () => {
    expect(formatAppVersionLabel()).toBe('v0.1.abc123def456');
  });
});
