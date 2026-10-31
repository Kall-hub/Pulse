import test from 'node:test';
import assert from 'node:assert/strict';
import { viewingSlots, hostBookings, monthDays } from '../../src/lib/viewings/calendar.mjs';
const now = Date.parse('2026-11-02T06:30:00Z');
const booking = { id: 'one', agent: ' Sam   Agent ', date: '2026-11-02', time: '09:00', status: 'Confirmed', unit: 'A612' };
test('calendar uses normalized host names and exact start times across all properties', () => {
 const slots = viewingSlots([booking], 'sam agent', booking.date, now);
 assert.equal(slots.length, 33);assert.equal(slots[0].time, '08:00');assert.equal(slots.at(-1).time,'16:00');
 assert.equal(slots.find(s=>s.time==='09:00').state,'booked');
 assert.equal(slots.find(s=>s.time==='09:15').state,'open');
 assert.equal(slots.find(s=>s.time==='08:30').state,'past');
 assert.equal(viewingSlots([booking],'Different Host',booking.date,now).find(s=>s.time==='09:00').state,'open');
});
test('cancelled bookings release slots while unresolved reschedules preserve the original', () => {
 assert.equal(hostBookings([{...booking,status:'Tenant Cancelled'}],'Sam Agent').length,0);
 assert.equal(hostBookings([{...booking,status:'Agent Cancelled'}],'Sam Agent').length,0);
 const pending={...booking,status:'Reschedule Requested',request:{date:booking.date,time:'10:00'}};
 const slots=viewingSlots([pending],'Sam Agent',booking.date,now);
 assert.equal(slots.find(s=>s.time==='09:00').state,'booked');
 assert.equal(slots.find(s=>s.time==='10:00').state,'open');
 assert.equal(viewingSlots([{...booking,status:'Completed'}],'Sam Agent',booking.date,now).find(s=>s.time==='09:00').state,'booked');
});
test('calendar requires a named host and lays out 42 Monday-first days across year boundaries', () => {
 assert.ok(viewingSlots([booking],'',booking.date,now).every(s=>s.state==='choose-host'));
 const days=monthDays('2027-01');assert.equal(days.length,42);assert.equal(days[0],'2026-12-28');assert.equal(days.at(-1),'2027-02-07');
});
