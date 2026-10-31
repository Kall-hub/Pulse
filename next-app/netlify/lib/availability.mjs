import { assertBookingAvailable } from './domain.mjs';

// A shared transaction lock serializes booking creation and approved reschedules.
// The date query also checks older bookings without normalized agent fields.
export async function reserveSlot(tx, db, candidate, excludeId) {
  const lock = db.doc('viewings/_schedule/locks/calendar');
  const previous = await tx.get(lock);
  const appointments = await tx.get(db.collection('viewings').where('date', '==', candidate.date));
  assertBookingAvailable(appointments.docs.map(d => ({ ...d.data(), id: d.id })), candidate, excludeId);
  tx.set(lock, { revision: (previous.data()?.revision || 0) + 1 });
}
