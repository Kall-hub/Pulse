import { contractorName, completeRepair, taskComplete } from './jobs.mjs';
const pick = (source, fields) => Object.fromEntries(fields.filter(key => source?.[key] !== undefined).map(key => [key, source[key]]));
export function publicTechJob(job) {
 return { ...pick(job, ['id','displayId','unit','status','issueDate','appointmentDate','appointmentTime','appointmentDuration','completedAt']), contractor: contractorName(job),
  ...(job.createdAt ? { createdAt: job.createdAt.toDate?.().toISOString() || job.createdAt } : {}),
  tasks: (Array.isArray(job.tasks) ? job.tasks : []).map(task => pick(task, ['id','desc','area','done','images','completedAt','completedBy'])) };
}
export function repairPatch(job, input, images, now = new Date()) {
 const current = job.tasks?.find(task => String(task.id) === String(input.taskId));
 if (current?.completionRequestId === input.requestId && taskComplete(current) && contractorName(job) === input.contractor) return null;
 const patch = completeRepair(job, input.taskId, images, input.contractor, now, input.expectedTask);
 patch.tasks = patch.tasks.map(task => String(task.id) === String(input.taskId) ? { ...task, completionRequestId: input.requestId } : task);
 return patch;
}
export function validateTechInput(input) {
 if (!input || typeof input !== 'object' || !/^[\w-]{1,150}$/.test(input.jobId || '') || !/^[\w-]{1,150}$/.test(String(input.taskId ?? '')) || !/^[\w-]{16,100}$/.test(input.requestId || '')) throw new Error('Invalid repair submission. Refresh your job and try again.');
 const name = contractorName({ contractor: input.contractor });
 if (!name || name !== input.contractor) throw new Error('Choose a valid contractor.');
 if (!input.expectedTask || typeof input.expectedTask !== 'object') throw new Error('Refresh the repair details before taking photos.');
 return input;
}
export function validateRepairPhotos(photos) {
 if (photos.length < 1 || photos.length > 2) throw new Error('Take one or two photos before completing this repair.');
 for (const photo of photos) {
  if (photo.type !== 'image/jpeg' || photo.bytes.length < 4 || photo.bytes.length > 900000 || photo.bytes[0] !== 255 || photo.bytes[1] !== 216 || photo.bytes.at(-2) !== 255 || photo.bytes.at(-1) !== 217) throw new Error('A repair photo is invalid or too large. Please retake it.');
 }
 return photos;
}
