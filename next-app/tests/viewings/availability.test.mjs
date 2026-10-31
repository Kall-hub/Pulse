import test from 'node:test';
import assert from 'node:assert/strict';
import { findBookingConflict, assertBookingAvailable } from '../../src/lib/viewings/domain.mjs';
import { reserveSlot } from '../../netlify/lib/availability.mjs';
const candidate = { agent: 'Sam Agent', date: '2026-11-01', time: '10:00', unit: 'A1' };
const existing = { ...candidate, id: 'old', status: 'Confirmed' };

test('agent conflicts ignore case, repeated spaces and property', () => {
  assert.equal(findBookingConflict([{ ...existing, agent: '  SAM   agent  ', unit: 'B99' }], candidate)?.id, 'old');
  assert.throws(() => assertBookingAvailable([existing], candidate), e => e.status === 409 && /Double booking/.test(e.message));
});
test('a different person, date or time is available', () => {
  for (const change of [{ agent: 'Other Agent' }, { date: '2026-11-02' }, { time: '10:01' }]) {
    assert.equal(findBookingConflict([existing], { ...candidate, ...change }), null);
  }
});
test('only cancellation frees an existing appointment; pending and completed appointments still clash', () => {
  for (const status of ['Agent Cancelled', 'Tenant Cancelled', 'cancelled']) {
    assert.equal(findBookingConflict([{ ...existing, status }], candidate), null);
  }
  for (const status of ['Awaiting Confirmation', 'Link Sent', 'No WhatsApp', 'Reschedule Requested', 'Completed']) {
    assert.ok(findBookingConflict([{ ...existing, status }], candidate));
  }
});
test('reschedule approval excludes itself but checks other appointments', () => {
  assert.equal(findBookingConflict([existing], candidate, existing.id), null);
  assert.equal(findBookingConflict([existing, { ...existing, id: 'other' }], candidate, existing.id)?.id, 'other');
});

// Optimistic transaction harness retries a transaction if another writer commits first.
function calendar(initial = []) {
  const bookings = new Map(initial.map(v => [v.id, v]));
  let revision = 0;
  const db = {
    doc: path => ({ path }),
    collection: () => ({ where: (_field, _operator, date) => ({ date }) }),
    async runTransaction(callback) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const snapshot = revision, writes = [];
        const tx = {
          async get(ref) {
            if (ref.path) return { data: () => ({ revision: snapshot }) };
            return { docs: [...bookings.values()].filter(v => v.date === ref.date).map(v => ({ id: v.id, data: () => ({ ...v }) })) };
          },
          set: (ref, value) => writes.push([ref, value])
        };
        await callback(tx);
        if (revision !== snapshot) continue;
        for (const [ref, value] of writes) {
          if (ref.path === 'viewings/_schedule/locks/calendar') revision = value.revision;
          else bookings.set(ref.path, { ...value, id: ref.path });
        }
        return;
      }
      throw new Error('Transaction retry limit');
    }
  };
  const book = (id, value) => db.runTransaction(async tx => { await reserveSlot(tx, db, value); tx.set(db.doc(id), value); });
  return { db, bookings, book };
}
test('concurrent bookings for the same person and slot allow exactly one save', async () => {
  const { book, bookings } = calendar();
  const results = await Promise.allSettled([
    book('one', { ...candidate, status: 'Awaiting Confirmation' }),
    book('two', { ...candidate, agent: ' SAM  AGENT ', unit: 'B2', status: 'Confirmed' })
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
  assert.equal(bookings.size, 1);
});
test('server reservation checks legacy names and allows reuse after cancellation', async () => {
  const { book, bookings } = calendar([{ ...existing, agent: 'SAM   AGENT' }]);
  await assert.rejects(book('new', candidate), e => e.status === 409);
  assert.equal(bookings.size, 1);
  bookings.set('old', { ...existing, status: 'Tenant Cancelled' });
  await book('new', candidate);
  assert.equal(bookings.size, 2);
});
