export const INTERNAL_CONTRACTORS = ['Rasta', 'Big boy'];
export const EXTERNAL_CONTRACTORS = ['Chris', 'Derrick'];
export const CONTRACTORS = [...INTERNAL_CONTRACTORS, ...EXTERNAL_CONTRACTORS];
export function contractorName(job) {
  const name = String(job.contractor === 'External' ? job.externalContractor || '' : job.contractor || '').trim();
  if (/^(derick|drerick|derrick)$/i.test(name)) return 'Derrick';
  return CONTRACTORS.find(person => person.toLowerCase() === name.toLowerCase()) || '';
}
export function jobText(job, contractor, url, now = new Date()) {
  const saved = now.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' });
  return [
    'PULSE JOB CARD', 'Contractor: ' + contractor,
    'Job: ' + (job.displayId || job.id || 'Unnumbered'), 'Property: ' + (job.unit || 'Not specified'),
    'Appointment: ' + (job.appointmentDate || 'Not scheduled') + (job.appointmentTime ? ' at ' + job.appointmentTime + ' (SAST), ' + job.appointmentDuration + ' minutes' : ''), 'Status: ' + (job.status || 'active'), '',
    ...(Array.isArray(job.tasks) ? job.tasks : []).map((task, index) => (index + 1) + '. [' + (task.done ? 'DONE' : 'TODO') + '] ' + (task.desc || 'Task') + (task.area ? ' - ' + task.area : '')),
    '', 'Saved: ' + saved + ' (SAST)', 'This is a snapshot. Open Pulse for the latest details and to record completed work.', url
  ].join('\n');
}

export const AGE_WARNING_DAYS = 5;
export const LOAD_WARNING_CARDS = 5;
export function sastDay(now = new Date()) {
  return new Date(new Date(now).valueOf() + 7200000).toISOString().slice(0, 10);
}
export function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value ? value : '';
}
function timestampDay(value) {
  try {
    const date = value?.toDate ? value.toDate() : value?.seconds != null ? new Date(value.seconds * 1000) : new Date(value);
    return Number.isFinite(date.valueOf()) ? sastDay(date) : '';
  } catch { return ''; }
}
export function ageDays(job, today = sastDay()) {
  const issued = validDay(job.issueDate) || (job.createdAt ? timestampDay(job.createdAt) : '');
  if (!issued || !validDay(today)) return null;
  return Math.max(0, Math.floor((Date.parse(today) - Date.parse(issued)) / 86400000));
}
export function hasTaskPhotos(task) {
  return Array.isArray(task?.images) && task.images.length >= 1 && task.images.length <= 2 && task.images.every(url => typeof url === 'string' && /^https:\/\//.test(url));
}
export const taskComplete = task => task?.done === true && hasTaskPhotos(task);
export const pendingRepairs = job => Array.isArray(job.tasks) ? job.tasks.filter(task => !taskComplete(task)).length : 0;
export function workload(jobs, name, today = sastDay(), excludeId) {
  const open = jobs.filter(job => job.status === 'active' && contractorName(job) === name && (!excludeId || job.id !== excludeId));
  const due = open.filter(job => validDay(job.appointmentDate) === today);
  const aged = open.filter(job => (ageDays(job, today) ?? -1) >= AGE_WARNING_DAYS);
  const overdue = open.filter(job => validDay(job.appointmentDate) && job.appointmentDate < today);
  return { name, open: open.length, today: due.length, aged: aged.length, overdue: overdue.length, unscheduled: open.filter(job => !validDay(job.appointmentDate)).length, repairs: open.reduce((sum, job) => sum + pendingRepairs(job), 0), high: open.length >= LOAD_WARNING_CARDS, heavyDay: due.length >= LOAD_WARNING_CARDS };
}
export function completeRepair(job, taskId, imageUrls, name, now = new Date(), expectedTask) {
  if (job.status !== 'active') throw new Error('This job is no longer active. Refresh your jobs.');
  if (contractorName(job) !== name) throw new Error('This job has been reassigned. Refresh your jobs.');
  if (!hasTaskPhotos({ images: imageUrls })) throw new Error('Take at least one photo and no more than two photos for this repair item.');
  const tasks = Array.isArray(job.tasks) ? job.tasks : [];
  const task = tasks.find(entry => String(entry.id) === String(taskId));
  if (!task) throw new Error('This repair item no longer exists. Refresh the job.');
  if (expectedTask && (task.desc !== expectedTask.desc || task.area !== expectedTask.area)) throw new Error('This repair item changed while you were taking photos. Refresh the job and check the repair before trying again.');
  if (taskComplete(task)) throw new Error('This repair item was already completed. Refresh the job.');
  const completedAt = new Date(now).toISOString();
  const updated = tasks.map(entry => String(entry.id) === String(taskId) ? { ...entry, done: true, images: imageUrls, completedAt, completedBy: name } : entry);
  const allDone = updated.length > 0 && updated.every(taskComplete);
  return { tasks: updated, ...(allDone ? { status: 'completed', completedBy: name, completedAt } : {}) };
}
export function appointmentGroup(job, today = sastDay()) {
  const day = validDay(job.appointmentDate);
  return !day ? 'unscheduled' : day === today ? 'today' : day < today ? 'overdue' : 'upcoming';
}

export function bookingLoad(jobs, candidate, today = sastDay()) {
  const name = contractorName(candidate), load = workload(jobs, name, today, candidate.id);
  const date = validDay(candidate.appointmentDate);
  const sameDate = date ? jobs.filter(job => job.id !== candidate.id && job.status === 'active' && contractorName(job) === name && job.appointmentDate === date).length : 0;
  return { contractor: name || 'Unassigned', date, openBefore: load.open, bookedOnDateBefore: sameDate, agedBefore: load.aged, capacityWarning: Boolean(name && candidate.status === 'active' && (load.open + 1 >= LOAD_WARNING_CARDS || sameDate + 1 >= LOAD_WARNING_CARDS)) };
}

// The caller must obtain the current role from the signed-in user's saved profile.
export function finalizeMaintenanceJob(job, { uid, role, waivePhotos = false }, now = new Date()) {
  if (!uid) throw new Error('Sign in before finalizing a job.');
  if (job.status !== 'active') throw new Error('This job is no longer active.');
  if (!Array.isArray(job.tasks) || !job.tasks.length) throw new Error('Add repair items before finalizing this job.');
  if (waivePhotos && role !== 'PQA') throw new Error('Only a user with PQA rights can finalize without photos.');
  if (!waivePhotos && !job.tasks.every(taskComplete)) throw new Error('Every repair item must be done with 1–2 photos before this job can be finalized.');
  const completedAt = new Date(now).toISOString();
  const patch = { status: 'completed', completedAt, completedByUid: uid };
  if (waivePhotos) {
    patch.photoWaiver = { approvedByUid: uid, approvedAt: completedAt, role: 'PQA', reason: 'Previously completed work; photos unavailable' };
    patch.tasks = job.tasks.map(task => ({ ...task, done: true, ...(!taskComplete(task) ? { pqaCompletion: { approvedByUid: uid, approvedAt: completedAt } } : {}) }));
  }
  return patch;
}
