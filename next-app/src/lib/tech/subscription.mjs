// The contractor portal deliberately works without Firebase authentication.
export function subscribeTechJobs({ load, onState, interval = 10000, listenFocus = () => () => {} }) {
 let disposed = false, running = false, controller;
 onState({ jobs: [], history: [], phase: 'loading', error: '' });
 async function refresh() {
  if (disposed || running) return;
  running = true;controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
   const data = await load(controller.signal);
   if (!disposed) onState({ ...data, phase: 'ready', error: '' });
  } catch (error) {
   if (!disposed) onState({ jobs: [], history: [], phase: 'error', error: error.name === 'AbortError' ? 'The connection took too long. Please retry loading your job cards.' : error.message || 'Unable to load contractor job cards. Please try again.' });
  } finally { clearTimeout(timer);running = false; }
 }
 refresh();
 const timer = setInterval(refresh, interval), stopFocus = listenFocus(refresh);
 return () => { disposed = true;controller?.abort();clearInterval(timer);stopFocus(); };
}
