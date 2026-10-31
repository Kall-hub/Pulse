import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createTechHandler } from '../../netlify/lib/tech-handler.mjs';
import { publicTechJob } from '../../src/lib/tech/publicJobs.mjs';
const jpg=await sharp({create:{width:4,height:4,channels:3,background:'#663399'}}).jpeg().toBuffer();
const input={jobId:'card1',taskId:1,contractor:'Rasta',requestId:'public-repair-request-123',expectedTask:{desc:'Fix tap',area:'Kitchen'}};
function setup({failUpload=false,reassign=false}={}){
 let job={id:'card1',status:'active',contractor:'Rasta',unit:'A612',tenantPhone:'private-phone',tenantName:'private-name',ownerUid:'private-uid',tasks:[{id:1,desc:'Fix tap',area:'Kitchen',done:false,liability:'Owner',cost:500}]};
 const uploads=[],events=[];const snapshot=()=>({exists:true,data:()=>job});
 const ref={get:async()=>snapshot(),collection:()=>({doc:id=>({id})})};
 const db={collection:()=>({doc:()=>ref,where:()=>({get:async()=>({docs:[{id:'card1',data:()=>job}]})})}),runTransaction:async callback=>{if(reassign)job={...job,contractor:'Big boy'};return callback({get:async()=>snapshot(),update:(ref,patch)=>{job={...job,...patch};},set:(ref,event)=>events.push(event)});}};
 const bucket={name:'test-bucket',file:path=>({save:async bytes=>{if(failUpload)throw new Error('Upload failed');uploads.push({path,bytes});}})};
 return {handler:createTechHandler({getDatabase:()=>db,getBucket:()=>bucket}),job:()=>job,uploads,events};
}
function request({photos=[jpg],payload=input}={}){
 const form=new FormData();form.set('repair',JSON.stringify(payload));photos.forEach(bytes=>form.append('photos',new Blob([bytes],{type:'image/jpeg'}),'repair.jpg'));
 return new Request('https://pulse.test/.netlify/functions/tech-jobs',{method:'POST',body:form});
}
test('public job list needs no login and strips tenant, account and financial fields',async()=>{
 const store=setup();const response=await store.handler(new Request('https://pulse.test/.netlify/functions/tech-jobs'));
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.jobs[0].contractor,'Rasta');
 const text=JSON.stringify(data);for(const value of ['private-phone','private-name','private-uid','liability','cost'])assert.ok(!text.includes(value));
 assert.equal(publicTechJob({...store.job(),unrelated:'private'}).unrelated,undefined);
});
test('public completion uploads a real photo, preserves metadata and is safe to retry',async()=>{
 const store=setup();let response=await store.handler(request());assert.equal(response.status,200);assert.equal((await response.json()).job.status,'completed');
 assert.equal(store.job().tasks[0].liability,'Owner');assert.equal(store.job().tasks[0].images.length,1);assert.equal(store.events.length,1);assert.equal(store.events[0].actorType,'public-tech-portal');
 response=await store.handler(request());assert.equal(response.status,200);assert.equal(store.uploads.length,1);assert.equal(store.events.length,1);
});
test('empty, excess or fake photos never mark a repair done',async()=>{
 for(const photos of [[],[jpg,jpg,jpg],[Buffer.from([255,216,1,2,255,217])]]){
  const store=setup();assert.equal((await store.handler(request({photos}))).status,400);assert.equal(store.job().tasks[0].done,false);assert.equal(store.events.length,0);
 }
});
test('upload failure and concurrent reassignment leave repair incomplete',async()=>{
 const old=console.error;console.error=()=>{};
 try{for(const options of [{failUpload:true},{reassign:true}]){
  const store=setup(options);assert.ok((await store.handler(request())).status>=400);assert.equal(store.job().tasks[0].done,false);assert.equal(store.events.length,0);
 }}finally{console.error=old;}
});
test('public repair cannot change host, scheduling, finances or waive photo rules',async()=>{
 const store=setup();const response=await store.handler(request({payload:{...input,status:'completed',appointmentDate:'2099-01-01',waivePhotos:true}}));assert.equal(response.status,200);
 assert.equal(store.job().appointmentDate,undefined);assert.equal(store.job().photoWaiver,undefined);
 const invalid=setup();assert.equal((await invalid.handler(request({payload:{...input,contractor:'Stranger'}}))).status,400);assert.equal(invalid.job().tasks[0].done,false);
});
