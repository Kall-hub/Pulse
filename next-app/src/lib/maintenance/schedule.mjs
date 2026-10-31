import { contractorName, validDay } from '../tech/jobs.mjs';
export const DAY_START = 8 * 60;
export const DAY_END = 16 * 60;
export const INTERVAL = 15;
export const DEFAULT_DURATION = 60;
export function minutes(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return null;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}
export function clock(value) { return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0'); }
export function addDays(day, count) { const date = new Date(day + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + count); return date.toISOString().slice(0, 10); }
export function weekDays(day) { const date = new Date(day + 'T12:00:00Z'); const monday = addDays(day, -((date.getUTCDay() + 6) % 7)); return Array.from({ length: 7 }, (_, index) => addDays(monday, index)); }
export function range(job) {
  const start = minutes(job.appointmentTime), duration = Number(job.appointmentDuration);
  if (start == null || !Number.isInteger(duration) || duration < INTERVAL || duration % INTERVAL || start % INTERVAL || start < DAY_START || start + duration > DAY_END) return null;
  return { start, end: start + duration, duration };
}
export function validateAppointment(job, { now = new Date(), requireFuture = true } = {}) {
  if (!contractorName(job)) throw new Error('Choose a contractor before booking a time.');
  if (!validDay(job.appointmentDate)) throw new Error('Choose a valid appointment date.');
  const period = range(job);
  if (!period) throw new Error('Choose a 15-minute start time and duration between 08:00 and 16:00.');
  if (requireFuture && Date.parse(job.appointmentDate + 'T' + job.appointmentTime + ':00+02:00') <= new Date(now).valueOf()) throw new Error('Choose a future appointment time.');
  return period;
}
export function isReserved(job) { return job.status === 'active' || (job.status === 'completed' && Boolean(range(job))); }
export function conflicts(jobs, candidate) {
  const period = range(candidate), name = contractorName(candidate);
  const peers = jobs.filter(job => job.id !== candidate.id && isReserved(job) && contractorName(job) === name && job.appointmentDate === candidate.appointmentDate);
  return { clashes: period ? peers.filter(job => { const other = range(job); return other && period.start < other.end && other.start < period.end; }) : [], untimed: peers.filter(job => !range(job)) };
}
export function daySlots(jobs, name, day, duration = DEFAULT_DURATION, { excludeId, now = new Date() } = {}) {
  if (!validDay(day) || !Number.isInteger(duration) || duration < INTERVAL || duration % INTERVAL || duration > DAY_END - DAY_START) return [];
  const contractor = ['Chris', 'Derrick'].includes(name) ? { contractor: 'External', externalContractor: name } : { contractor: name };
  return Array.from({ length: Math.floor((DAY_END - DAY_START - duration) / INTERVAL) + 1 }, (_, index) => {
    const start = DAY_START + index * INTERVAL, time = clock(start);
    const candidate = { id: excludeId, ...contractor, appointmentDate: day, appointmentTime: time, appointmentDuration: duration };
    const { clashes, untimed } = conflicts(jobs, candidate);
    const own = jobs.find(job => job.id === excludeId && isReserved(job) && contractorName(job) === name && job.appointmentDate === day);
    const ownRange = own ? range(own) : null;
    const reusesOwnTime = ownRange && start < ownRange.end && ownRange.start < start + duration;
    const past = Date.parse(day + 'T' + time + ':00+02:00') <= new Date(now).valueOf();
    return { time, end: clock(start + duration), start, status: past ? 'past' : clashes.length ? 'booked' : untimed.length ? 'review' : reusesOwnTime ? 'current' : 'open', clashes, untimed };
  });
}
export function assignment(name) {
  return ['Chris', 'Derrick'].includes(name) ? { contractor: 'External', externalContractor: name } : { contractor: name, externalContractor: '' };
}
export function appointmentLabel(job) { const period = range(job); return period ? job.appointmentTime + '–' + clock(period.end) : job.status === 'completed' ? 'Time not recorded' : 'Time needed'; }
