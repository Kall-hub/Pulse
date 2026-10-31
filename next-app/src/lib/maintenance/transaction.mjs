import { contractorName, bookingLoad, validDay, sastDay } from '../tech/jobs.mjs';
import { conflicts, range, validateAppointment, isReserved } from './schedule.mjs';

export async function applySchedule(transaction, { id, patch, knownJobs, refs, stamp, actorUid = null, now = new Date(), options = {} }) {
  const { allowUntimed = false, requireFuture = true, expected } = options;
  const jobRef = refs.job(id), eventRef = refs.event;
    const snapshot = await transaction.get(jobRef);
    if (!snapshot.exists() || snapshot.data().status !== 'active') throw new Error('This job is no longer active. Refresh the job cards.');
    const current = { ...snapshot.data(), id };
    if (expected && ['contractor', 'externalContractor', 'appointmentDate', 'appointmentTime', 'appointmentDuration'].some(key => (current[key] ?? '') !== (expected[key] ?? ''))) throw new Error('This booking changed in another session. Reopen it before saving.');
    const candidate = { ...current, ...patch }, name = contractorName(candidate), date = validDay(candidate.appointmentDate);
    if (candidate.appointmentTime && name && date) validateAppointment(candidate, { requireFuture, now });
    let registry, registryData, peers = [];
    if (name && date) {
      registry = refs.day(name, date);
      registryData = await transaction.get(registry);
      const ids = [...new Set([...(registryData.data()?.jobIds || []), ...knownJobs.filter(job => isReserved(job) && job.appointmentDate === date && contractorName(job) === name).map(job => job.id)])].filter(value => value !== id);
      const fresh = await Promise.all(ids.map(async value => {
        const entry = await transaction.get(refs.job(value));
        return entry.exists() ? { ...entry.data(), id: entry.id } : null;
      }));
      peers = fresh.filter(job => job && isReserved(job) && job.appointmentDate === date && contractorName(job) === name);
      const result = conflicts(peers, candidate);
      if (result.clashes.length) throw new Error('Appointment overlaps ' + result.clashes.map(job => job.displayId || job.unit || job.id).join(', ') + '. Choose an open slot.');
      if (range(candidate) && result.untimed.length && !allowUntimed) {
        const error = new Error(result.untimed.length + ' other job card(s) for this contractor and day have no time. Their availability is not confirmed. Review those cards before continuing.');
        error.code = 'UNTIMED_REVIEW'; throw error;
      }
    }
    const combined = [...knownJobs.filter(job => !peers.some(peer => peer.id === job.id)), ...peers];
    const context = { ...bookingLoad(combined, candidate, sastDay(now)), recordedAt: new Date(now).toISOString(), actorUid: actorUid, time: candidate.appointmentTime || '', duration: Number(candidate.appointmentDuration) || null, untimedReviewAcknowledged: allowUntimed };
    const update = { ...patch, scheduleContext: context, updatedAt: stamp() };
    if (name && name !== contractorName(current)) { update.assignedAt = stamp(); update.assignedByUid = actorUid; }
    if (registry) transaction.set(registry, { jobIds: [...peers.map(job => job.id), id], revision: (registryData.data()?.revision || 0) + 1, updatedAt: stamp() });
    transaction.update(jobRef, update);
    transaction.set(eventRef, { action: 'office-schedule-change', ...context, previousDate: current.appointmentDate || '', previousTime: current.appointmentTime || '', createdAt: stamp() });
    return { ...candidate, scheduleContext: context };
}
