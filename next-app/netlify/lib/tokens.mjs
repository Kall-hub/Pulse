import { createHmac, timingSafeEqual } from 'node:crypto';
import { fail } from './domain.mjs';
function secret() {
  const s = process.env.VIEWING_LINK_SECRET;
  if (!s || s.length < 32) throw new Error('Configure VIEWING_LINK_SECRET with at least 32 characters.');
  return s;
}
export function signLink(id, expires, version = 0) {
  const body = Buffer.from(JSON.stringify({ id, expires, version })).toString('base64url');
  return `${body}.${createHmac('sha256', secret()).update(body).digest('base64url')}`;
}
export function verifyLink(token) {
  if (typeof token !== 'string' || token.length > 1000) fail('Invalid or expired booking link.', 401);
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra) fail('Invalid booking link.', 401);
  const expected = createHmac('sha256', secret()).update(body).digest();
  const actual = Buffer.from(sig, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) fail('Invalid booking link.', 401);
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { fail('Invalid booking link.', 401); }
  if (!payload || typeof payload !== 'object' || !/^[a-zA-Z0-9_-]{1,150}$/.test(payload.id || '') || !Number.isFinite(payload.expires) || payload.expires < Date.now() || !Number.isInteger(payload.version)) fail('This link has expired. Please contact your agent.', 401);
  return payload;
}
