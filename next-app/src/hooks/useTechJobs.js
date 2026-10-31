'use client';
import { useEffect, useState } from 'react';
import { contractorName } from '../lib/tech/jobs.mjs';
import { subscribeTechJobs } from '../lib/tech/subscription.mjs';
import { loadTechJobs } from '../lib/tech/client.mjs';
export default function useTechJobs(name, historyOpen) {
 const [state, setState] = useState({ jobs: [], history: [], phase: 'loading', error: '' });
 const [attempt, setAttempt] = useState(0);
 useEffect(() => subscribeTechJobs({
  load: signal => loadTechJobs(name, historyOpen, signal),
  onState: setState,
  listenFocus: refresh => { window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); },
 }), [attempt, name, historyOpen]);
 return {
  team: state.jobs,
  jobs: state.jobs.filter(job => contractorName(job) === name),
  history: state.history,
  loading: state.phase === 'loading',
  ready: state.phase === 'ready',
  historyLoading: false,
  error: state.error,
  retry: () => { setState({ jobs: [], history: [], phase: 'loading', error: '' }); setAttempt(value => value + 1); },
 };
}
