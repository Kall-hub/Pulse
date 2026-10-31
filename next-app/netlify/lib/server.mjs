import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { signLink } from './tokens.mjs';
export { verifyLink } from './tokens.mjs';
import { fail, normalizeViewing } from './domain.mjs';
export function database() {
  const missing = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"].filter(name => !process.env[name]?.trim());
  if (missing.length) fail("Viewings backend is running but Firebase server settings are missing. Fill in .env.local using VIEWINGS_SETUP.md, then restart npm run dev. On Netlify, set the server environment variables.", 503);
  const app = getApps()[0] || initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') }) });
  return { db: getFirestore(app), auth: getAuth(app) };
}
export async function agent(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) fail('Please sign in.', 401);
  const { auth } = database();
  let user;
  try { user = await auth.verifyIdToken(token, true); } catch { fail('Please sign in again.', 401); }
  // Only server-controlled allowlists/custom claims grant management access.
  // The existing app permits profile writes, so profile.role alone is not trusted here.
  const allowed = (process.env.VIEWING_AGENT_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.includes(user.uid) && user.viewingsAgent !== true && user.admin !== true) fail('This account is not enabled for viewings. Add its Firebase UID to VIEWING_AGENT_UIDS in .env.local locally, or in Netlify environment variables.', 403);
  return user;
}
export function linkFor(id, v) {
  const token = signLink(id, v.linkExpiresAt, v.linkVersion || 0);
  return `${process.env.APP_ORIGIN}/viewing#${token}`;
}
export function publicBooking(v) {
  v = normalizeViewing(v);
  return { unit: v.unit, agent: v.agent, date: v.date, time: v.time, status: v.status, request: v.request || null, revision: v.revision || 0, lastDecision: v.lastDecision || null, officePhone: process.env.OFFICE_PHONE || '' };
}
export function response(data, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } }); }
export function errorResponse(e) { if (!e.status) console.error('Viewings API:', e); return response({ error: e.status ? e.message : 'Unable to process this request. Please try again or contact your agent.' }, e.status || 500); }
export async function body(request) { const raw = await request.text(); if (raw.length > 8192) fail('Request is too large.', 413); let value; try { value = JSON.parse(raw); } catch { fail('Invalid request.'); } if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Invalid request.'); return value; }
