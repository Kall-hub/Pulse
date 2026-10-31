async function result(response) {
 let data;
 try { data = await response.json(); } catch { throw new Error('The contractor service is unavailable. Please try again.'); }
 if (!response.ok) throw new Error(data.error || 'Unable to load or save this job. Please try again.');
 return data;
}
export async function loadTechJobs(name, historyOpen, signal) {
 const search = new URLSearchParams();
 if (name) search.set('contractor', name);
 if (historyOpen) search.set('history', '1');
 const data = await result(await fetch('/.netlify/functions/tech-jobs?' + search, { signal, credentials: 'omit', cache: 'no-store' }));
 if (!Array.isArray(data.jobs) || !Array.isArray(data.history)) throw new Error('The contractor service returned an incomplete job list. Please retry.');
 return data;
}
export async function saveTechRepair(input, files) {
 const form = new FormData();form.set('repair', JSON.stringify(input));
 for (const file of files) form.append('photos', file, 'repair.jpg');
 const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 60000);
 try {
  const data = await result(await fetch('/.netlify/functions/tech-jobs', { method: 'POST', body: form, signal: controller.signal, credentials: 'omit' }));
  if (!data.job?.tasks) throw new Error('Refresh your job to check whether the repair was saved before trying again.');
  return data.job;
 } catch (error) {
  if (error.name === 'AbortError') throw new Error('The connection took too long. Refresh your job to check whether the photos and completion were saved before trying again.');
  throw error;
 } finally { clearTimeout(timer); }
}
