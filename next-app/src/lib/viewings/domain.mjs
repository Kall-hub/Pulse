export function normalizeUnitName(raw = '') {
  const value = String(raw || '').trim().replace(/\s+/g, ' ').toUpperCase();
  const key = value.replace(/[^A-Z0-9]/g, '');
  const aliases = { LC: 'LUNNON CREST', LUNNONCREST: 'LUNNON CREST', BLVD: 'HILLCREST BOULEVARD', BOULEVARD: 'HILLCREST BOULEVARD', HILLCRESTBOULEVARD: 'HILLCREST BOULEVARD', VIEW: 'HILLCREST VIEW', HILLCRESTVIEW: 'HILLCREST VIEW', VILLAMAG: 'VILLA MAGNOLIA', VILLAMAGNOLIA: 'VILLA MAGNOLIA', JAK: 'JAKARANDA', JAKARANDA: 'JAKARANDA', JAKRANDA: 'JAKARANDA', RUM: 'RUMOURS', RUMOURS: 'RUMOURS' };
  return aliases[key] || value;
}
export const ACTIVE = ['Awaiting Confirmation', 'Link Sent', 'Confirmed', 'Reschedule Requested', 'Slot Unavailable', 'No WhatsApp'];
export const TERMINAL = ['Completed', 'Tenant Cancelled', 'Agent Cancelled'];
export function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
export function text(value, name, max = 100) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`${name} is required (maximum ${max} characters).`);
  return value.trim();
}
export function phoneNumber(value) {
  let p = text(value, 'Phone', 30).replace(/[\s()+.-]/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('0')) p = `27${p.slice(1)}`;
  if (/^[6-8]\d{8}$/.test(p)) p = `27${p}`;
  if (!/^[1-9]\d{7,14}$/.test(p)) fail('Enter a valid phone number, including the country code for numbers outside South Africa.');
  return p;
}
export function slot(date, time, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) fail('Choose a valid date and time.');
  if (!['00', '15', '30', '45'].includes(time.slice(3))) fail('Choose a time in 15-minute intervals (:00, :15, :30 or :45).');
  if (time < '08:00' || time > '16:00') fail('Choose a viewing time between 08:00 and 16:00 (SAST).');
  const d = new Date(`${date}T${time}:00+02:00`);
  if (!Number.isFinite(d.valueOf()) || new Date(d.valueOf() + 7200000).toISOString().slice(0, 10) !== date) fail('Choose a valid date.');
  if (d.valueOf() <= now) fail('Choose a future date and time (South Africa time).');
  return { date, time };
}
export function createBooking(input, now = Date.now()) {
  return { prospect: text(input.prospect, 'Tenant name'), phone: phoneNumber(input.phone), unit: normalizeUnitName(text(input.unit, 'Property / unit')), agent: text(input.agent, 'Agent name'), ...slot(input.date, input.time, now), status: 'Awaiting Confirmation', whatsappStatus: input.whatsappPreferred === false ? 'not-preferred' : 'preferred', outcome: null, note: '', request: null, revision: 0, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() };
}
// Pure state machine; persistence uses a Firestore transaction and revision check.
export function transition(v, input, actor, now = Date.now()) {
  if (!ACTIVE.includes(v.status)) fail('This viewing has already ended.', 409);
  const updatedAt = new Date(now).toISOString();
  const patch = { revision: (v.revision || 0) + 1, updatedAt };
  const action = input.action;
  if (actor === 'tenant') {
    if (action === 'cancel') return { ...patch, status: 'Tenant Cancelled', request: null, tenantResponse: { action: 'cancelled', at: updatedAt } };
    if (action === 'confirm') {
      if (!['Awaiting Confirmation', 'Link Sent', 'Confirmed', 'Slot Unavailable'].includes(v.status)) fail('Please choose another slot or wait for your agent.', 409);
      if (new Date(`${v.date}T${v.time}:00+02:00`).valueOf() <= now) fail('The original appointment time has already passed. Please contact your agent to arrange another viewing.');
      slot(v.date, v.time, now);
      return { ...patch, status: 'Confirmed', request: null, tenantResponse: { action: v.status === 'Slot Unavailable' ? 'kept-original' : v.tenantResponse?.action === 'kept-original' ? 'kept-original' : 'confirmed', date: v.date, time: v.time, at: updatedAt } };
    }
    if (action === 'reschedule') {
      if (v.status === 'Reschedule Requested') fail('Your request is already awaiting review.', 409);
      const requested = slot(input.date, input.time, now);
      if (requested.date === v.date && requested.time === v.time) fail('Please choose a different slot.');
      return { ...patch, status: 'Reschedule Requested', request: { ...requested, requestedAt: updatedAt }, lastDecision: null, tenantResponse: { action: 'reschedule-requested', at: updatedAt } };
    }
    fail('Unknown tenant action.');
  }
  if (action === 'cancel') return { ...patch, status: 'Agent Cancelled', request: null };
  if (action === 'approve' || action === 'reject') {
    if (v.status !== 'Reschedule Requested' || !v.request) fail('There is no pending reschedule request.', 409);
    if (action === 'approve') {
      slot(v.request.date, v.request.time, now);
      return { ...patch, date: v.request.date, time: v.request.time, status: 'Confirmed', request: null, lastDecision: { action, request: v.request, at: updatedAt } };
    }
    return { ...patch, status: 'Slot Unavailable', request: null, lastDecision: { action, request: v.request, at: updatedAt } };
  }
  if (action === 'complete') {
    if (!['Awaiting Confirmation', 'Confirmed', 'Link Sent', 'No WhatsApp'].includes(v.status)) fail('Resolve the reschedule before logging an outcome.', 409);
    if (new Date(`${v.date}T${v.time}:00+02:00`).valueOf() > now) fail('Log the outcome after the viewing time.');
    if (!['Accepted', 'Thinking', 'Rejected', 'No Show'].includes(input.outcome)) fail('Choose an outcome.');
    return { ...patch, status: 'Completed', outcome: input.outcome, note: typeof input.note === 'string' ? input.note.trim().slice(0, 1000) : '' };
  }
  if (action === 'no-whatsapp') return { ...patch, whatsappStatus: 'no-whatsapp' };
  fail('Unknown action.');
}
export function analytics(viewings) {
  const groups = new Map();
  for (const v of viewings) {
    const unit = normalizeUnitName(v.unit || 'Unknown');
    if (!groups.has(unit)) groups.set(unit, { unit, bookings: 0, visits: 0, cancelled: 0, days: {} });
    const g = groups.get(unit); g.bookings++;
    if ((v.status || '').includes('Cancelled')) g.cancelled++;
    if (v.status === 'Completed' && v.outcome !== 'No Show') {
      g.visits++;
      if (/^\d{4}-\d{2}-\d{2}$/.test(v.date || '')) g.days[v.date] = (g.days[v.date] || 0) + 1;
    }
  }
  const ranking = [...groups.values()].sort((a, b) => b.visits - a.visits || b.bookings - a.bookings || a.unit.localeCompare(b.unit));
  return { ranking, top: ranking.find(g => g.visits >= 5) || null };
}
export function dailySeries(days, length = 30, now = new Date()) {
  const today = new Date(now.valueOf() + 7200000).toISOString().slice(0, 10);
  const end = new Date(`${today}T12:00:00Z`);
  return Array.from({ length }, (_, i) => { const d = new Date(end); d.setUTCDate(d.getUTCDate() - length + 1 + i); const date = d.toISOString().slice(0, 10); return { date, count: days[date] || 0 }; });
}

// Properties do not affect availability: a person can only host one viewing at a time.
export function normalizeAgent(value) {
  return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() : '';
}
export function findBookingConflict(viewings, candidate, excludeId) {
  const agent = normalizeAgent(candidate.agent);
  if (!agent || !candidate.date || !candidate.time) return null;
  return viewings.find(v => (!excludeId || v.id !== excludeId)
    && !/cancelled/i.test(v.status || '')
    && normalizeAgent(v.agent) === agent
    && v.date === candidate.date && v.time === candidate.time) || null;
}
export function assertBookingAvailable(viewings, candidate, excludeId) {
  if (findBookingConflict(viewings, candidate, excludeId)) {
    fail('Double booking: ' + candidate.agent.trim() + ' already has an appointment on ' + candidate.date + ' at ' + candidate.time + ' (SAST). Choose another time or cancel the existing appointment.', 409);
  }
}

// Older viewing pages stored preferred slots under rescheduleRequest.
export function normalizeViewing(viewing) {
  return viewing.status === 'Reschedule Requested' && !viewing.request && viewing.rescheduleRequest
    ? { ...viewing, request: viewing.rescheduleRequest }
    : viewing;
}
