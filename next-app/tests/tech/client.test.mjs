import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTechJobs, saveTechRepair } from '../../src/lib/tech/client.mjs';
test('job loading sends no login credentials and asks for the selected contractor history',async()=>{
 const original=global.fetch;
 global.fetch=async(url,options)=>{assert.match(url,/contractor=Big.boy/);assert.match(url,/history=1/);assert.equal(options.credentials,'omit');assert.equal(options.headers,undefined);return Response.json({jobs:[],history:[]});};
 try{assert.deepEqual(await loadTechJobs('Big boy',true),{jobs:[],history:[]});}finally{global.fetch=original;}
});
test('photo completion uses the public multipart service without Firebase credentials',async()=>{
 const original=global.fetch;
 global.fetch=async(url,options)=>{assert.equal(options.method,'POST');assert.equal(options.credentials,'omit');assert.equal(options.headers,undefined);assert.equal(options.body.getAll('photos').length,1);assert.equal(JSON.parse(options.body.get('repair')).contractor,'Rasta');return Response.json({job:{status:'completed',tasks:[{done:true}]}});};
 try{assert.equal((await saveTechRepair({contractor:'Rasta'},[new Blob(['photo'],{type:'image/jpeg'})])).status,'completed');}finally{global.fetch=original;}
});
