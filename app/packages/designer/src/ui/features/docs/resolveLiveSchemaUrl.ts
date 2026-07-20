const CHANNEL_PATTERN = /^(latest|v\d+)$/;

/**
 * Build the public JSON Schema URL for a docs live-schema fence.
 * Channel must be `latest` or `v{n}` — rejects path traversal.
 */
export function resolveLiveSchemaUrl(channel: string, baseUrl = '/'): string | null {
  const normalized = channel.trim() || 'latest';
  if (!CHANNEL_PATTERN.test(normalized)) {
    return null;
  }
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}schemas/${normalized}/blueprint.schema.json`;
}
