const BUILD_ID_META = 'app-build-id';

export function parseBuildIdFromHtml(html: string): string | null {
  const match = html.match(
    new RegExp(`<meta\\s+name="${BUILD_ID_META}"\\s+content="([^"]+)"`, 'i')
  );
  return match?.[1] ?? null;
}

/** Build id baked into this running bundle (vite `define` or index.html meta). */
export function getLocalBuildId(): string {
  if (typeof __APP_BUILD_ID__ !== 'undefined' && __APP_BUILD_ID__) {
    return __APP_BUILD_ID__;
  }
  if (typeof document === 'undefined') return '';
  return document.querySelector(`meta[name="${BUILD_ID_META}"]`)?.getAttribute('content') ?? '';
}

/** Fetch the deploy's current build id from index.html (bypass HTTP cache). */
export async function fetchRemoteBuildId(baseUrl: string): Promise<string | null> {
  try {
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const response = await fetch(`${base}index.html`, { cache: 'no-store' });
    if (!response.ok) return null;
    return parseBuildIdFromHtml(await response.text());
  } catch {
    return null;
  }
}

export async function hasRemoteBuildUpdate(baseUrl: string): Promise<boolean> {
  const local = getLocalBuildId();
  if (!local) return false;
  const remote = await fetchRemoteBuildId(baseUrl);
  return !!remote && remote !== local;
}

function packageMajorMinor(version: string): string {
  const [major, minor] = version.split('.');
  if (!major || minor === undefined) return '0.1';
  return `${major}.${minor}`;
}

/** Display label for the running app, e.g. `v0.1.abc123def456`. */
export function formatAppVersionLabel(): string {
  const majorMinor =
    typeof __APP_PACKAGE_VERSION__ !== 'undefined'
      ? packageMajorMinor(__APP_PACKAGE_VERSION__)
      : '0.1';
  const buildId = getLocalBuildId() || 'dev';
  return `v${majorMinor}.${buildId}`;
}
