const MASK_FIELDS = new Set([
  'password',
  'password_hash',
  'new_password',
  'current_password',
  'refresh_token',
  'access_token',
]);

export function maskBody(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    result[k] = MASK_FIELDS.has(k) ? '***' : v;
  }
  return result;
}
