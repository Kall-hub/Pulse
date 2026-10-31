import { agent, database, response, errorResponse, body } from '../lib/server.mjs';
import { reserveSlot } from '../lib/availability.mjs';
import { createBooking, normalizeViewing } from '../lib/domain.mjs';
export async function GET(request) {
  try { await agent(request); const snap = await database().db.collection('viewings').get(); return response({ viewings: snap.docs.map(d => ({ ...normalizeViewing(d.data()), id: d.id })).sort((a,b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)) }); } catch (e) { return errorResponse(e); }
}
export async function POST(request) {
  try {
    const user = await agent(request);
    const v = createBooking(await body(request));
    // Thirty days after the appointment, or thirty days from creation, whichever is later.
    v.linkExpiresAt = Math.max(Date.now(), new Date(`${v.date}T${v.time}:00+02:00`).valueOf()) + 30 * 86400000;
    v.linkVersion = 0; v.createdBy = user.uid;
    const { db } = database();
    const ref = db.collection('viewings').doc();
    await db.runTransaction(async tx => {
      await reserveSlot(tx, db, v);
      tx.set(ref, v);
    });
    return response({ viewing: { ...v, id: ref.id } }, 201);
  } catch (e) { return errorResponse(e); }
}

export default async function handler(request){if(request.method==='GET')return GET(request);if(request.method==='POST')return POST(request);return response({error:'Method not allowed.'},405);}
