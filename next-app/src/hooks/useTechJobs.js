'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../app/Config/firebaseConfig';
import { contractorName } from '../lib/tech/jobs.mjs';
import { subscribeTechJobs } from '../lib/tech/subscription.mjs';
export default function useTechJobs(name, historyOpen) {
 const [state, setState] = useState({ jobs: [], phase: 'loading', error: '' });
 const [attempt, setAttempt] = useState(0);
 useEffect(() => subscribeTechJobs({
  watchAuth: listener => onAuthStateChanged(auth, listener),
  // Match Maintenance's collection subscription, including older cards without createdAt.
  watchJobs: (next, error) => onSnapshot(collection(db, 'maintenance'), { includeMetadataChanges: true }, next, error),
  onState: setState,
 }), [attempt]);
 const team = state.jobs.filter(job => job.status === 'active');
 return {
  team,
  jobs: team.filter(job => contractorName(job) === name),
  history: historyOpen ? state.jobs.filter(job => job.status === 'completed' && contractorName(job) === name) : [],
  loading: state.phase === 'loading' || state.phase === 'cached',
  ready: state.phase === 'ready',
  cached: state.phase === 'cached',
  historyLoading: false,
  error: state.error,
  retry: () => { setState({ jobs: [], phase: 'loading', error: '' }); setAttempt(value => value + 1); },
 };
}
