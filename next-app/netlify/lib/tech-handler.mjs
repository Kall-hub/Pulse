import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { contractorName } from '../../src/lib/tech/jobs.mjs';
import { publicTechJob, repairPatch, validateTechInput, validateRepairPhotos } from '../../src/lib/tech/publicJobs.mjs';
const response = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export function createTechHandler({ getDatabase, getBucket, now = () => new Date() }) {
 return async function handler(request) {
  try {
   const url = new URL(request.url);
   if (request.method === 'GET') {
    const name = url.searchParams.get('contractor') || '';
    if (name && contractorName({ contractor: name }) !== name) return response({ error: 'Choose a valid contractor.' }, 400);
    const db = getDatabase();
    const active = await db.collection('maintenance').where('status', '==', 'active').get();
    const jobs = active.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(job => contractorName(job)).map(publicTechJob);
    let history = [];
    if (url.searchParams.get('history') === '1' && name) {
     const completed = await db.collection('maintenance').where('status', '==', 'completed').get();
     history = completed.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(job => contractorName(job) === name).map(publicTechJob);
    }
    return response({ jobs, history });
   }
   if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
   if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return response({ error: 'Send the repair photos with your submission.' }, 400);
   const bytes = await request.arrayBuffer();
   if (bytes.byteLength > 2500000) return response({ error: 'Photos are too large. Please retake smaller photos.' }, 413);
   const form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type') } }).formData();
   let input;
   try { input = validateTechInput(JSON.parse(form.get('repair'))); } catch (error) { return response({ error: error.message || 'Invalid repair submission.' }, 400); }
   const photos = [];
   for (const file of form.getAll('photos')) {
    if (typeof file === 'string') return response({ error: 'Take a repair photo before marking it done.' }, 400);
    photos.push({ type: file.type, bytes: Buffer.from(await file.arrayBuffer()) });
   }
   try { validateRepairPhotos(photos); } catch (error) { return response({ error: error.message }, 400); }
   try {
    for (const photo of photos) photo.bytes = await sharp(photo.bytes, { limitInputPixels: 16000000 }).rotate().resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 65 }).toBuffer();
   } catch { return response({ error: 'This photo could not be read. Please retake it.' }, 400); }
   const db = getDatabase(), jobRef = db.collection('maintenance').doc(input.jobId);
   const initial = await jobRef.get();
   if (!initial.exists) return response({ error: 'This job no longer exists.' }, 404);
   try {
    const preview = repairPatch(initial.data(), input, photos.map(() => 'https://evidence.invalid/pending.jpg'), now());
    if (!preview) return response({ job: publicTechJob({ ...initial.data(), id: input.jobId }) });
   } catch (error) { return response({ error: error.message }, 409); }
   const bucket = getBucket(), images = [];
   for (let index = 0; index < photos.length; index++) {
    const path = 'maintenance/' + input.jobId + '/' + input.taskId + '_' + input.requestId + '_' + index + '.jpg';
    const token = createHash('sha256').update(path).digest('hex');
    const file = bucket.file(path);
    try { await file.save(photos[index].bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: 'image/jpeg', metadata: { firebaseStorageDownloadTokens: token } } }); }
    catch (error) { if (Number(error.code) !== 412) throw error; }
    images.push('https://firebasestorage.googleapis.com/v0/b/' + bucket.name + '/o/' + encodeURIComponent(path) + '?alt=media&token=' + token);
   }
   const job = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(jobRef);
    if (!snapshot.exists) throw new Error('This job no longer exists.');
    let patch;
    try { patch = repairPatch(snapshot.data(), input, images, now()); } catch (error) { error.status = 409; throw error; }
    if (patch) {
     transaction.update(jobRef, { ...patch, updatedAt: now().toISOString() });
     transaction.set(jobRef.collection('events').doc(input.requestId), { action: 'repair-completed-with-photos', taskId: input.taskId, photoCount: images.length, actorName: input.contractor, actorType: 'public-tech-portal', createdAt: now().toISOString() });
    }
    return publicTechJob({ ...snapshot.data(), ...patch, id: input.jobId });
   });
   return response({ job });
  } catch (error) {
   if (error.status) return response({ error: error.message }, error.status);
   console.error('Tech portal:', error);
   return response({ error: 'Unable to save or load this job. Please refresh and check its current status before trying again.' }, 500);
  }
 };
}
