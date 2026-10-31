import { doc, collection, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../app/Config/firebaseConfig';
import { applySchedule } from './transaction.mjs';

export async function saveSchedule(id, patch, knownJobs, options = {}) {
  const job = value => doc(db, 'maintenance', value);
  const event = doc(collection(job(id), 'events'));
  const refs = { job, event, day: (name, date) => doc(db, 'maintenance', '_schedule', 'days', name.toLowerCase().replace(/\s+/g, '_') + '_' + date) };
  return runTransaction(db, transaction => applySchedule(transaction, { id, patch, knownJobs, options, refs, stamp: serverTimestamp, actorUid: auth.currentUser?.uid || null }));
}
