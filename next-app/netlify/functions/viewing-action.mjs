import { reserveSlot } from '../lib/availability.mjs';
import { agent, database, response, errorResponse, body, linkFor } from '../lib/server.mjs';
import { transition, fail, TERMINAL } from '../lib/domain.mjs';
export async function POST(request, context) {
  try {
    const user = await agent(request), input = await body(request), { id } = await context.params;
    if (!/^[\w-]{1,150}$/.test(id)) fail('Invalid booking.');
    const { db } = database(), ref = db.collection('viewings').doc(id);
    const viewing = await db.runTransaction(async tx => {
      const snap = await tx.get(ref); if (!snap.exists) fail('Booking not found.', 404);
      const v = snap.data();
      if (input.revision !== (v.revision || 0)) fail('This booking changed. Refresh and try again.', 409);
      let patch;
      if (input.action === 'share') {
        if (TERMINAL.includes(v.status)) fail('This viewing has ended.', 409);
        // Refresh expired links and support older records which have never had a secure link.
        patch = { linkExpiresAt: Math.max(Date.now(), new Date(`${v.date}T${v.time}:00+02:00`).valueOf() || 0) + 30 * 86400000, linkVersion: (v.linkVersion || 0) + 1, revision: (v.revision || 0) + 1, updatedAt: new Date().toISOString() };
      } else {
        patch = transition(v, input, 'agent');
        if (['approve', 'reject'].includes(input.action)) {
          patch.linkVersion = (v.linkVersion || 0) + 1;
          patch.linkExpiresAt = Math.max(Date.now(), new Date(`${patch.date || v.date}T${patch.time || v.time}:00+02:00`).valueOf() || 0) + 30 * 86400000;
        }
      }
      const next = { ...v, ...patch };
      // Construct and validate links before committing a state transition.
      const link = ['share','approve','reject'].includes(input.action) ? linkFor(id, next) : null;
      if (input.action === 'approve') await reserveSlot(tx, db, next, id);
      tx.update(ref, patch);
      tx.set(ref.collection('events').doc(), { action: input.action, actor: user.uid, at: new Date().toISOString(), previousStatus: v.status, status: next.status, request: v.request || null, date: next.date, time: next.time });
      return { ...next, id, link };
    });
    return response({ viewing });
  } catch (e) { return errorResponse(e); }
}

export default async function handler(request){if(request.method!=='POST')return response({error:'Method not allowed.'},405);return POST(request,{params:Promise.resolve({id:new URL(request.url).searchParams.get('id')})});}
