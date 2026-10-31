import { database, verifyLink, publicBooking, response, errorResponse, body } from '../lib/server.mjs';
import { transition, fail } from '../lib/domain.mjs';
// Token is sent in an authorization header, never in a URL query or request log.
function payload(request) { return verifyLink(request.headers.get('authorization')?.replace(/^Bearer /, '')); }
function check(v, token) { if ((v.linkVersion || 0) !== token.version || v.linkExpiresAt !== token.expires) fail('This link has been replaced. Ask your agent for the latest link.', 401); }
export async function GET(request) {
  try {
    const token = payload(request), snap = await database().db.collection('viewings').doc(token.id).get();
    if (!snap.exists) fail('Booking not found.', 404);
    const v = snap.data(); check(v, token); return response({ viewing: publicBooking(v) });
  } catch (e) { return errorResponse(e); }
}
export async function POST(request) {
  try {
    const token = payload(request), input = await body(request), { db } = database(), ref = db.collection('viewings').doc(token.id);
    const viewing = await db.runTransaction(async tx => {
      const snap = await tx.get(ref); if (!snap.exists) fail('Booking not found.', 404);
      const v = snap.data(); check(v, token);
      if ((v.revision || 0) !== input.revision) fail('Your booking changed. Refresh to see the latest details.', 409);
      const patch = transition(v, input, 'tenant');
      tx.update(ref, patch);
      tx.set(ref.collection('events').doc(), { action: input.action, actor: 'tenant-link', at: new Date().toISOString(), previousStatus: v.status, status: patch.status, request: patch.request || null });
      return publicBooking({ ...v, ...patch });
    });
    return response({ viewing });
  } catch (e) { return errorResponse(e); }
}

export default async function handler(request){if(request.method==='GET')return GET(request);if(request.method==='POST')return POST(request);return response({error:'Method not allowed.'},405);}
export const config={rateLimit:{action:'rate_limit',aggregateBy:['ip','domain'],windowSize:60,windowLimit:60}};
