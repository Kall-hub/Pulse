import test from 'node:test';
import assert from 'node:assert/strict';
import { conflicts, daySlots, range, validateAppointment, weekDays, assignment } from '../../src/lib/maintenance/schedule.mjs';
import { applySchedule } from '../../src/lib/maintenance/transaction.mjs';
const now = new Date('2026-10-31T06:00:00Z');
const day = '2026-11-02';
const card = (id, extra = {}) => ({ id, status: 'active', contractor: 'Rasta', appointmentDate: day, appointmentTime: '09:00', appointmentDuration: 60, displayId: 'JC-' + id, ...extra });
test('real interval overlap is blocked, adjacent appointments are allowed', () => {
  assert.equal(conflicts([card('a')],card('b',{appointmentTime:'09:30'})).clashes.length,1);
  assert.equal(conflicts([card('a')],card('b',{appointmentTime:'10:00'})).clashes.length,0);
  assert.equal(conflicts([card('a')],card('a')).clashes.length,0);
  assert.equal(conflicts([card('a')],card('b',{contractor:'Big boy'})).clashes.length,0);
});
test('removed or cancelled bookings do not reserve a slot; completed timed records remain visible reservations', () => {
  assert.equal(conflicts([card('a',{status:'cancelled'})],card('b')).clashes.length,0);
  assert.equal(conflicts([card('a',{status:'completed'})],card('b')).clashes.length,1);
  assert.equal(conflicts([card('a',{appointmentDate:''})],card('b')).clashes.length,0);
});
test('legacy date-only appointments prevent false open-slot claims', () => {
  const legacy=card('old',{appointmentTime:'',appointmentDuration:null});
  assert.equal(daySlots([legacy],'Rasta',day,60,{now})[0].status,'review');
  assert.equal(daySlots([legacy],'Big boy',day,60,{now})[0].status,'open');
  assert.equal(range(legacy),null);
});
test('working hours, quarter hours, duration and SAST future times are validated', () => {
  assert.deepEqual(range(card('a')),{start:540,end:600,duration:60});
  assert.ok(validateAppointment(card('a',{appointmentTime:'15:00'}),{now}));
  for(const extra of [{appointmentTime:'07:45'},{appointmentTime:'15:15'},{appointmentTime:'09:10'},{appointmentDuration:20},{appointmentDuration:0},{appointmentDate:'2026-02-30'}]) assert.throws(()=>validateAppointment(card('a',extra),{now}));
  assert.equal(daySlots([],'Rasta','2026-10-31',60,{now:new Date('2026-10-31T07:30:00Z')}).find(slot=>slot.time==='09:00').status,'past');
  assert.equal(daySlots([],'Rasta',day,60,{now}).at(-1).end,'16:00');
});
test('week view starts on Monday and crosses month boundaries correctly', () => {
  assert.deepEqual(weekDays('2026-11-01'),['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
  assert.deepEqual(assignment('Derrick'),{contractor:'External',externalContractor:'Derrick'});
});
function database(initial) {
  const rows=new Map(initial.map(row=>['jobs/'+row.id,structuredClone(row)])),versions=new Map();
  let event=0;
  const refs={job:id=>'jobs/'+id,day:(name,date)=>'days/'+name+'/'+date,event:'events/test'};
  const put=(key,value)=>{rows.set(key,structuredClone(value));versions.set(key,(versions.get(key)||0)+1);};
  const save=async(id,patch,knownJobs=[],options={})=>{
    for(let attempt=0;attempt<10;attempt++){
      const reads=new Map(),writes=[];
      const tx={
        async get(key){ if(writes.length)throw Error('Read after write');reads.set(key,versions.get(key)||0);const data=structuredClone(rows.get(key));return {exists:()=>data!==undefined,data:()=>data,id:key.split('/').at(-1)}; },
        set:(key,value)=>writes.push([key,value,false]),update:(key,value)=>writes.push([key,value,true])
      };
      const result=await applySchedule(tx,{id,patch,knownJobs,options,refs:{...refs,event:'events/'+(++event)},stamp:()=>now.toISOString(),actorUid:'office-user',now});
      if([...reads].some(([key,version])=>(versions.get(key)||0)!==version))continue;
      for(const [key,value,merge] of writes)put(key,merge?{...rows.get(key),...value}:value);
      return result;
    }
    throw Error('Retry limit');
  };
  return {rows,put,save};
}
const empty = id => card(id,{contractor:'Unassigned',appointmentDate:'',appointmentTime:'',appointmentDuration:null});
const patch={...assignment('Rasta'),appointmentDate:day,appointmentTime:'09:00',appointmentDuration:60};
test('simultaneous overlapping appointments allow exactly one reservation', async () => {
  const db=database([empty('a'),empty('b')]);
  const results=await Promise.allSettled([db.save('a',patch),db.save('b',{...patch,appointmentTime:'09:30'})]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.match(results.find(result=>result.status==='rejected').reason.message,/overlaps/);
});
test('simultaneous adjacent appointments and different contractors can both book', async () => {
  const db=database([empty('a'),empty('b'),empty('c')]);
  await Promise.all([db.save('a',patch),db.save('b',{...patch,appointmentTime:'10:00'}),db.save('c',{...patch,contractor:'Big boy'})]);
  assert.equal(db.rows.get('jobs/b').appointmentTime,'10:00');
});
test('removing an appointment frees the registry slot without closing the job', async () => {
  const db=database([empty('a'),empty('b')]);
  await db.save('a',patch);
  await db.save('a',{appointmentDate:'',appointmentTime:'',appointmentDuration:null},[],{requireFuture:false});
  await db.save('b',patch);
  assert.equal(db.rows.get('jobs/a').status,'active');assert.equal(db.rows.get('jobs/b').appointmentTime,'09:00');
});
test('legacy time review is explicit and reservations preserve job repair data', async () => {
  const legacy=card('old',{appointmentTime:'',appointmentDuration:null});
  const item={...empty('new'),tasks:[{id:1,done:true,images:['https://example.test/photo.jpg']}]};
  const db=database([legacy,item]);
  await assert.rejects(db.save('new',patch,[legacy]),error=>error.code==='UNTIMED_REVIEW');
  await db.save('new',patch,[legacy],{allowUntimed:true});
  assert.deepEqual(db.rows.get('jobs/new').tasks,item.tasks);
  assert.equal(db.rows.get('jobs/new').scheduleContext.untimedReviewAcknowledged,true);
});
test('stale edits cannot overwrite an appointment changed by another session', async () => {
  const original=empty('a'),db=database([original]);await db.save('a',patch);
  await assert.rejects(db.save('a',{...patch,appointmentTime:'11:00'},[],{expected:original}),/changed in another session/);
  assert.equal(db.rows.get('jobs/a').appointmentTime,'09:00');
});

test('registry reads current completion and cancellation status before reserving', async () => {
  const db=database([empty('a'),empty('b')]);await db.save('a',patch);
  db.put('jobs/a',{...db.rows.get('jobs/a'),status:'completed'});
  await assert.rejects(db.save('b',patch),/overlaps/);
  db.put('jobs/a',{...db.rows.get('jobs/a'),status:'cancelled'});
  await db.save('b',patch);
  assert.equal(db.rows.get('jobs/b').appointmentTime,'09:00');
});

test('rescheduling labels reusable time as the current card instead of falsely calling it open', () => {
  const slots=daySlots([card('a')],'Rasta',day,60,{excludeId:'a',now});
  assert.equal(slots.find(slot=>slot.time==='09:00').status,'current');
  assert.equal(slots.find(slot=>slot.time==='11:00').status,'open');
});
