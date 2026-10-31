import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingMessage } from '../../src/lib/viewings/share.mjs';
const booking = { prospect: 'Sam', unit: 'A612', date: '2026-11-02', time: '09:00', lastDecision: { action: 'reject', request: { date: '2026-11-03', time: '10:15' } } };
test('rejection sharing and re-sharing explains requested and original slots and client choices', () => {
 const text = bookingMessage({ ...booking, status: 'Slot Unavailable' }, 'https://pulse.example/viewing#private');
 assert.match(text, /2026-11-03 at 10:15 is unavailable/);
 assert.match(text, /original viewing on 2026-11-02 at 09:00/);
 assert.match(text, /keep the original time or cancel/);
 assert.match(text, /https:\/\/pulse.example\/viewing#private/);
});
test('approval sharing uses the saved new date and time', () => {
 const text = bookingMessage({ ...booking, status: 'Confirmed', date: '2026-11-03', time: '10:15', lastDecision: { action: 'approve' } }, 'https://pulse.example/viewing#new');
 assert.match(text, /approved: 2026-11-03 at 10:15/);
 assert.doesNotMatch(text, /unavailable/);
});
