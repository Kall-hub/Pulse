import { normalizeAgent, findBookingConflict } from './domain.mjs';
export const VIEWING_TIMES = Array.from({ length: 33 }, (_, i) => String(8 + Math.floor(i / 4)).padStart(2, '0') + ':' + String(i % 4 * 15).padStart(2, '0'));
export function hostBookings(viewings, agent, date) {
 const key = normalizeAgent(agent);
 return key ? viewings.filter(v => !/cancelled/i.test(v.status || '') && normalizeAgent(v.agent) === key && (!date || v.date === date)) : [];
}
export function viewingSlots(viewings, agent, date, now = Date.now()) {
 return VIEWING_TIMES.map(time => {
  const booking = findBookingConflict(viewings, { agent, date, time });
  return { time, booking, state: booking ? 'booked' : !normalizeAgent(agent) ? 'choose-host' : new Date(date + 'T' + time + ':00+02:00').valueOf() <= now ? 'past' : 'open' };
 });
}
export function monthDays(month) {
 const first = new Date(month + '-01T12:00:00Z');
 const start = new Date(first);start.setUTCDate(1 - (first.getUTCDay() + 6) % 7);
 return Array.from({ length: 42 }, (_, index) => {const day = new Date(start);day.setUTCDate(start.getUTCDate() + index);return day.toISOString().slice(0, 10);});
}
