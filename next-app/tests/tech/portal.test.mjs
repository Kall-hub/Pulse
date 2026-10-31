import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { INTERNAL_CONTRACTORS, finalizeMaintenanceJob, CONTRACTORS, contractorName, jobText, sastDay, ageDays, appointmentGroup, workload, hasTaskPhotos, taskComplete, completeRepair, bookingLoad } from '../../src/lib/tech/jobs.mjs';
test('portal includes the two internal and two external contractors', () => {
  assert.deepEqual(CONTRACTORS, ['Rasta', 'Big boy', 'Chris', 'Derrick']);
  assert.equal(contractorName({ contractor: ' big BOY ' }), 'Big boy');
  assert.equal(contractorName({ contractor: 'External', externalContractor: 'Chris' }), 'Chris');
  for (const name of ['Derick', 'Drerick', 'Derrick']) assert.equal(contractorName({ contractor: 'External', externalContractor: name }), 'Derrick');
  assert.equal(contractorName({ contractor: 'Johannes' }), '');
});
test('job handout preserves tasks and identifies itself as a SAST snapshot', () => {
  const text=jobText({ displayId:'JOB-123',unit:'A612',status:'active',appointmentDate:'2026-11-01',tasks:[{desc:'Fix tap',area:'Kitchen',done:false},{desc:'Replace seat',area:'Bathroom',done:true}] },'Rasta','https://example.test/tech-view',new Date('2026-10-31T23:00:00Z'));
  assert.match(text,/1\. \[TODO\] Fix tap - Kitchen/);
  assert.match(text,/2\. \[DONE\] Replace seat - Bathroom/);
  assert.match(text,/Rasta/);assert.match(text,/JOB-123/);assert.match(text,/snapshot/);assert.match(text,/SAST/);assert.ok(text.endsWith('https://example.test/tech-view'));
  assert.ok(!/[^\x00-\x7F]/.test(text));
});
test('missing job data does not break plain text export', () => {
  assert.match(jobText({},'Chris','/tech-view'),/Unnumbered/);
});
test('tech install manifest has an in-scope launch URL and correctly sized local PNG icons', () => {
  const manifest=JSON.parse(fs.readFileSync('public/tech-view.webmanifest','utf8'));
  assert.equal(manifest.start_url,'/tech-view');assert.ok(manifest.start_url.startsWith(manifest.scope));assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons){
    const png=fs.readFileSync('public'+icon.src);const size=Number(icon.sizes.split('x')[0]);
    assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
  }
});

const now = new Date('2026-10-31T10:00:00Z');
const photo = 'https://firebasestorage.googleapis.com/repair.jpg';
const job = (extra = {}) => ({ id: 'job1', displayId: 'JC-1', contractor: 'Rasta', status: 'active', issueDate: '2026-10-26', appointmentDate: '2026-10-31', tasks: [{ id: 1, desc: 'Fix tap', area: 'Kitchen', done: false, liability: 'Owner' }], ...extra });
test('repair completion requires one or two nonempty photo URLs', () => {
  for (const images of [[], [''], ['not-a-url'], [photo, photo, photo]]) {
    assert.equal(hasTaskPhotos({ images }), false);
    assert.throws(() => completeRepair(job(), 1, images, 'Rasta', now), /photo/);
  }
  assert.equal(hasTaskPhotos({ images: [photo] }), true);
  assert.equal(hasTaskPhotos({ images: [photo, photo] }), true);
});
test('an old tick without photo evidence does not unlock completion', () => {
  const old = job({ tasks: [{ id: 1, done: true, images: [] }, { id: 2, done: false }] });
  assert.equal(taskComplete(old.tasks[0]), false);
  assert.equal(completeRepair(old, 2, [photo], 'Rasta', now).status, undefined);
  const fixed = completeRepair(old, 1, [photo], 'Rasta', now);
  assert.ok(taskComplete(fixed.tasks[0]));
});
test('last evidenced repair completes job atomically while preserving task metadata', () => {
  const patch = completeRepair(job(), 1, [photo], 'Rasta', now);
  assert.equal(patch.status, 'completed'); assert.equal(patch.completedBy, 'Rasta');
  assert.equal(patch.tasks[0].liability, 'Owner');assert.equal(patch.tasks[0].images.length, 1);
});
test('completion uses latest task data and rejects reassigned, ended or duplicate repairs', () => {
  const current = job({ tasks: [{ id: 1, done: false }, { id: 2, done: false }] });
  const first = completeRepair(current, 1, [photo], 'Rasta', now);
  const second = completeRepair({ ...current, ...first }, 2, [photo], 'Rasta', now);
  assert.equal(second.tasks.filter(taskComplete).length, 2);assert.equal(second.status, 'completed');
  assert.throws(() => completeRepair({ ...current, ...first }, 1, [photo], 'Rasta', now), /already completed/);
  assert.throws(() => completeRepair(job({ contractor: 'Big boy' }), 1, [photo], 'Rasta', now), /reassigned/);
  assert.throws(() => completeRepair(job({ status: 'completed' }), 1, [photo], 'Rasta', now), /no longer active/);
  assert.throws(() => completeRepair(job(), 999, [photo], 'Rasta', now), /no longer exists/);
});
test('today uses SAST, including the date after UTC midnight boundary', () => {
  assert.equal(sastDay(new Date('2026-10-31T22:30:00Z')), '2026-11-01');
  assert.equal(appointmentGroup(job(), '2026-10-31'), 'today');
  assert.equal(appointmentGroup(job({ appointmentDate: '2026-10-30' }), '2026-10-31'), 'overdue');
  assert.equal(appointmentGroup(job({ appointmentDate: '2026-11-01' }), '2026-10-31'), 'upcoming');
  for (const date of ['', undefined, '2026-02-30']) assert.equal(appointmentGroup(job({ appointmentDate: date }), '2026-10-31'), 'unscheduled');
});
test('five-day age warning is calendar-based and separate from future appointment dates', () => {
  assert.equal(ageDays(job(), '2026-10-31'), 5);
  assert.equal(ageDays(job({ issueDate: '2026-10-27' }), '2026-10-31'), 4);
  assert.equal(ageDays(job({ issueDate: '', createdAt: { seconds: Date.parse('2026-10-26T12:00Z') / 1000 } }), '2026-10-31'), 5);
  assert.equal(ageDays(job({ issueDate: '', createdAt: null }), '2026-10-31'), null);
  const future = job({ appointmentDate: '2026-11-02' });
  assert.equal(workload([future], 'Rasta', '2026-10-31').aged, 1);
  assert.equal(workload([future], 'Rasta', '2026-10-31').overdue, 0);
});
test('capacity counts job cards separately from repair items and excludes completed jobs', () => {
  const cards = Array.from({ length: 5 }, (_, i) => job({ id: String(i) }));
  const report = workload([...cards, job({ status: 'completed' }), job({ contractor: 'Big boy' })], 'Rasta', '2026-10-31');
  assert.equal(report.open, 5);assert.equal(report.today, 5);assert.equal(report.repairs, 5);assert.equal(report.high, true);assert.equal(report.aged, 5);
  assert.equal(workload(cards, 'Rasta', '2026-10-31', '0').high, false);
  const manyTasks = job({ tasks: Array.from({ length: 8 }, (_, id) => ({ id, done: false })) });
  assert.equal(workload([manyTasks], 'Rasta', '2026-10-31').high, false);
  assert.equal(workload([manyTasks], 'Rasta', '2026-10-31').repairs, 8);
});

test('office capacity review includes proposed booking and records existing load without counting itself', () => {
  const existing = Array.from({ length: 4 }, (_, i) => job({ id: String(i) }));
  const candidate = job({ id: 'new' });
  const snapshot = bookingLoad(existing, candidate, '2026-10-31');
  assert.equal(snapshot.openBefore, 4);assert.equal(snapshot.bookedOnDateBefore, 4);assert.equal(snapshot.capacityWarning, true);
  assert.deepEqual(bookingLoad([...existing, candidate], candidate, '2026-10-31'), snapshot);
  assert.equal(bookingLoad(existing, { ...candidate, contractor: 'Big boy' }, '2026-10-31').capacityWarning, false);
  assert.equal(bookingLoad(existing, { ...candidate, contractor: 'Unassigned' }, '2026-10-31').capacityWarning, false);
});

test('photos cannot complete a different repair description changed during upload', () => {
  assert.throws(() => completeRepair(job(), 1, [photo], 'Rasta', now, { desc: 'Replace a light', area: 'Kitchen' }), /changed while/);
});


test('capacity roster contains only internal contractors', () => {
  assert.deepEqual(INTERNAL_CONTRACTORS, ['Rasta', 'Big boy']);
});

test('photo waiver requires explicit PQA approval and an authenticated approver', () => {
  for (const role of ['Maintenance Admin', 'Finance', 'Contractor', undefined]) {
    assert.throws(() => finalizeMaintenanceJob(job(), { uid: 'user1', role, waivePhotos: true }, now), /Only.*PQA/);
  }
  assert.throws(() => finalizeMaintenanceJob(job(), { uid: 'pqa1', role: 'PQA' }, now), /photos/);
  assert.throws(() => finalizeMaintenanceJob(job(), { role: 'PQA', waivePhotos: true }, now), /Sign in/);
  assert.throws(() => finalizeMaintenanceJob(job({ status: 'completed' }), { uid: 'pqa1', role: 'PQA', waivePhotos: true }, now), /no longer active/);
  assert.throws(() => finalizeMaintenanceJob(job({ tasks: [] }), { uid: 'pqa1', role: 'PQA', waivePhotos: true }, now), /repair items/);
});

test('PQA archives legacy work with attribution and preserves actual evidence', () => {
  const evidenced = { id: 2, done: true, images: [photo], completedBy: 'Rasta' };
  const patch = finalizeMaintenanceJob(job({ tasks: [...job().tasks, evidenced] }), { uid: 'pqa1', role: 'PQA', waivePhotos: true }, now);
  assert.equal(patch.status, 'completed');
  assert.equal(patch.photoWaiver.approvedByUid, 'pqa1');
  assert.equal(patch.photoWaiver.approvedAt, now.toISOString());
  assert.equal(patch.tasks[0].done, true);
  assert.equal(patch.tasks[0].images, undefined);
  assert.equal(patch.tasks[0].liability, 'Owner');
  assert.equal(patch.tasks[0].pqaCompletion.approvedByUid, 'pqa1');
  assert.deepEqual(patch.tasks[1], evidenced);
  assert.equal(taskComplete(patch.tasks[0]), false);
});

test('normal finalization still requires completed items with evidence', () => {
  const patch = finalizeMaintenanceJob(job({ tasks: [{ id: 1, done: true, images: [photo] }] }), { uid: 'admin1' }, now);
  assert.equal(patch.status, 'completed');
  assert.equal(patch.photoWaiver, undefined);
});

test('contractor matching handles legacy spacing, casing and external labels', () => {
 assert.equal(contractorName({contractor:'  BIG   BOY  '}),'Big boy');
 assert.equal(contractorName({contractor:' RASTA '}),'Rasta');
 assert.equal(contractorName({contractor:' external ',externalContractor:' DRERICK '}),'Derrick');
 assert.equal(contractorName({contractor:' external ',externalContractor:' chris '}),'Chris');
});
