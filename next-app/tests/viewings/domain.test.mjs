import test from 'node:test';
import assert from 'node:assert/strict';
import { createBooking, transition, analytics, dailySeries, phoneNumber, slot, normalizeViewing } from '../../src/lib/viewings/domain.mjs';
const now = Date.parse('2026-10-29T08:00:00Z');
const input = { prospect:'Jane Tenant',phone:'082 123 4567',unit:'a612',agent:'Sam Agent',date:'2026-11-01',time:'10:00' };
const booking = () => createBooking(input,now);
test('booking requires manual agent and normalizes South African phones', () => {
  assert.equal(booking().agent,'Sam Agent'); assert.equal(booking().phone,'27821234567');
  assert.throws(() => createBooking({...input,agent:''},now));
  assert.equal(phoneNumber('+44 7700 900123'),'447700900123');
  assert.equal(phoneNumber('0027821234567'),'27821234567');
  assert.throws(() => phoneNumber('abc0821234567'));
});
test('invalid dates, invalid times and past SAST slots are rejected', () => {
  assert.throws(() => slot('2026-02-30','10:00',0)); assert.throws(() => slot('2026-11-01','25:00',now)); assert.throws(() => slot('2026-10-29','09:00',now));
});
test('reschedule keeps current appointment until approval, then moves it', () => {
  const v=booking(), patch=transition(v,{action:'reschedule',date:'2026-11-02',time:'14:30'},'tenant',now);
  const pending={...v,...patch}; assert.equal(pending.date,'2026-11-01'); assert.equal(pending.status,'Reschedule Requested');
  const approved={...pending,...transition(pending,{action:'approve'},'agent',now)};
  assert.equal(approved.date,'2026-11-02'); assert.equal(approved.time,'14:30'); assert.equal(approved.status,'Confirmed'); assert.equal(approved.request,null);
  assert.throws(() => transition(approved,{action:'approve'},'agent',now));
});
test('unavailable slot preserves the original until the client explicitly keeps it or cancels', () => {
  const v=booking(), pending={...v,...transition(v,{action:'reschedule',date:'2026-11-02',time:'14:30'},'tenant',now)};
  const rejected={...pending,...transition(pending,{action:'reject'},'agent',now)};
  assert.equal(rejected.date,v.date); assert.equal(rejected.status,'Slot Unavailable');
  const kept = { ...rejected, ...transition(rejected,{action:'confirm'},'tenant',now) };
  assert.equal(kept.status, 'Confirmed');
  assert.equal(kept.date, v.date);
  assert.equal(kept.time, v.time);
  assert.equal(transition(rejected,{action:'cancel'},'tenant',now).status, 'Tenant Cancelled');
  assert.throws(() => transition(rejected,{action:'confirm'},'tenant',Date.parse('2026-12-01')));
  assert.equal(transition(rejected,{action:'reschedule',date:'2026-11-03',time:'09:00'},'tenant',now).status,'Reschedule Requested');
});
test('cancelled and completed records reject later tenant actions', () => {
  const v=booking(), cancelled={...v,...transition(v,{action:'cancel'},'tenant',now)};
  assert.equal(cancelled.status,'Tenant Cancelled'); assert.throws(() => transition(cancelled,{action:'reschedule',date:'2026-11-02',time:'14:30'},'tenant',now));
  assert.throws(() => transition({...v,status:'Completed'},{action:'cancel'},'tenant',now));
});
test('tenant cannot approve, log outcomes, or overwrite a pending request', () => {
  assert.throws(() => transition(booking(),{action:'approve'},'tenant',now));
  assert.throws(() => transition(booking(),{action:'complete',outcome:'Accepted'},'tenant',now));
  assert.throws(() => transition({...booking(),status:'Reschedule Requested'},{action:'reschedule',date:'2026-11-02',time:'14:30'},'tenant',now));
});
test('future viewings and unresolved requests cannot be completed', () => {
  assert.throws(() => transition(booking(),{action:'complete',outcome:'Accepted'},'agent',now));
  assert.throws(() => transition({...booking(),status:'Reschedule Requested'},{action:'complete',outcome:'Accepted'},'agent',Date.parse('2026-12-01')));
});
test('no-WhatsApp flag preserves the appointment and pending request', () => {
  const v={...booking(),status:'Reschedule Requested',request:{date:'2026-11-02',time:'14:30'}};
  const next={...v,...transition(v,{action:'no-whatsapp'},'agent',now)};
  assert.equal(next.status,v.status); assert.deepEqual(next.request,v.request);
});
test('five-visit threshold excludes cancellations, pending bookings and no shows', () => {
  const visits=Array.from({length:4},(_,i)=>({...booking(),id:String(i),status:'Completed',outcome:'Thinking'}));
  const other=[{...booking(),status:'Tenant Cancelled'},{...booking(),status:'Completed',outcome:'No Show'},booking()];
  assert.equal(analytics([...visits,...other]).top,null);
  const stats=analytics([...visits,...other,{...booking(),status:'Completed',outcome:'Accepted'}]);
  assert.equal(stats.top.visits,5); assert.equal(stats.top.cancelled,1); assert.equal(stats.top.days['2026-11-01'],5);
});
test('daily graph zero fills and respects SAST at UTC day boundary', () => {
  const series=dailySeries({'2026-10-30':2},30,new Date('2026-10-29T23:00:00Z'));
  assert.equal(series.length,30); assert.deepEqual(series.at(-1),{date:'2026-10-30',count:2}); assert.equal(series[0].count,0);
});

test('booking and reschedule slots must use quarter-hour intervals', () => {
  for (const minutes of ['00', '15', '30', '45']) {
    assert.equal(slot('2026-11-01', '10:' + minutes, now).time, '10:' + minutes);
  }
  for (const minutes of ['01', '10', '16', '29', '46', '59']) {
    assert.throws(() => createBooking({ ...input, time: '10:' + minutes }, now), /15-minute/);
    assert.throws(() => transition(booking(), { action: 'reschedule', date: '2026-11-02', time: '10:' + minutes }, 'tenant', now), /15-minute/);
  }
  assert.throws(() => transition({ ...booking(), status: 'Reschedule Requested', request: { date: '2026-11-02', time: '10:07' } }, { action: 'approve' }, 'agent', now), /15-minute/);
});

test('viewing hours include 08:00 and 16:00 and reject slots outside office hours', () => {
  for (const time of ['08:00', '08:15', '15:45', '16:00']) {
    assert.equal(slot('2026-11-01', time, now).time, time);
  }
  for (const time of ['00:00', '07:45', '16:15', '16:45', '23:45']) {
    assert.throws(() => createBooking({ ...input, time }, now), /08:00 and 16:00/);
    assert.throws(() => transition(booking(), { action: 'reschedule', date: '2026-11-02', time }, 'tenant', now), /08:00 and 16:00/);
    assert.throws(() => transition({ ...booking(), status: 'Reschedule Requested', request: { date: '2026-11-02', time } }, { action: 'approve' }, 'agent', now), /08:00 and 16:00/);
  }
});

 test('analytics combines property aliases from remote viewing fixes', () => {
  const rows = ['LC', 'Lunnon Crest', 'LUNNONCREST', 'LC', 'Lunnon Crest'].map(unit => ({ unit, status: 'Completed', outcome: 'Accepted' }));
  assert.equal(analytics(rows).top.unit, 'LUNNON CREST');
  assert.equal(analytics(rows).top.visits, 5);
 });

test('legacy preferred slots can be reviewed without losing the original appointment', () => {
 const old = { ...booking(), status: 'Reschedule Requested', rescheduleRequest: { date: '2026-11-02', time: '14:30' } };
 const current = normalizeViewing(old);
 assert.deepEqual(current.request, old.rescheduleRequest);
 assert.equal(transition(current, { action: 'approve' }, 'agent', now).date, '2026-11-02');
 assert.equal(transition(current, { action: 'reject' }, 'agent', now).lastDecision.request.time, '14:30');
 assert.equal(normalizeViewing({ ...old, status: 'Slot Unavailable' }).request, null);
});

test('keeping the original slot persists the client response and survives repeat confirmation', () => {
 const original = booking();
 const rejected = { ...original, status: 'Slot Unavailable', lastDecision: { action: 'reject', request: { date: '2026-11-02', time: '14:30' } } };
 const patch = transition(rejected, { action: 'confirm' }, 'tenant', now);
 assert.equal(patch.status, 'Confirmed');
 assert.equal(patch.request, null);
 assert.deepEqual(patch.tenantResponse, { action: 'kept-original', date: original.date, time: original.time, at: new Date(now).toISOString() });
 const saved = { ...rejected, ...patch };
 assert.equal(saved.date, original.date);
 assert.equal(saved.time, original.time);
 assert.equal(transition(saved, { action: 'confirm' }, 'tenant', now).tenantResponse.action, 'kept-original');
 assert.equal(transition(saved, { action: 'reschedule', date: '2026-11-03', time: '09:00' }, 'tenant', now).tenantResponse.action, 'reschedule-requested');
 assert.equal(transition(saved, { action: 'cancel' }, 'tenant', now).tenantResponse.action, 'cancelled');
 assert.throws(() => transition(rejected, { action: 'confirm' }, 'tenant', Date.parse('2026-12-01')), /already passed/);
});
