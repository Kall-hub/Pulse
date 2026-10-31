// Wait for restored Firebase authentication, and never treat cached emptiness as zero live jobs.
export function subscribeTechJobs({ watchAuth, watchJobs, onState }) {
 let disposed = false, generation = 0, stopJobs;
 const stopAuth = watchAuth(user => {
  const current = ++generation;
  stopJobs?.(); stopJobs = undefined;
  if (disposed) return;
  if (!user) { onState({ jobs: [], phase: 'signed-out', error: 'Sign in to Pulse to view contractor job cards, then reopen Tech View.' }); return; }
  onState({ jobs: [], phase: 'loading', error: '' });
  stopJobs = watchJobs(snapshot => {
   if (disposed || current !== generation) return;
   const jobs = snapshot.docs.map(entry => ({ ...entry.data(), id: entry.id }));
   const cached = snapshot.metadata?.fromCache || snapshot.metadata?.hasPendingWrites;
   onState({ jobs, phase: cached ? 'cached' : 'ready', error: '' });
  }, error => {
   if (disposed || current !== generation) return;
   onState({ jobs: [], phase: 'error', error: error?.code === 'permission-denied' ? 'Your session cannot access maintenance job cards. Sign in again or ask the office to check your access.' : 'Unable to load contractor job cards. Check your connection and try again.' });
  });
 });
 return () => { disposed = true; generation++; stopJobs?.(); stopAuth(); };
}
