import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribeTechJobs } from '../../src/lib/tech/subscription.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('loads jobs immediately without an authentication dependency',async()=>{
 const states=[];let calls=0;
 const stop=subscribeTechJobs({load:async()=>{calls++;return {jobs:[{id:'one'}],history:[]};},onState:s=>states.push(s)});
 await tick();assert.equal(calls,1);assert.equal(states[0].phase,'loading');assert.equal(states.at(-1).phase,'ready');assert.equal(states.at(-1).jobs[0].id,'one');stop();
});
test('failed access is displayed as an error and focus refresh recovers',async()=>{
 let focus,fail=true;const states=[];
 const stop=subscribeTechJobs({load:async()=>{if(fail)throw new Error('Service unavailable');return {jobs:[],history:[]};},onState:s=>states.push(s),listenFocus:listener=>{focus=listener;return()=>{};}});
 await tick();assert.equal(states.at(-1).phase,'error');assert.match(states.at(-1).error,/Service unavailable/);
 fail=false;await focus();assert.equal(states.at(-1).phase,'ready');stop();
});
test('unmount aborts requests and ignores late results',async()=>{
 let finish,signal;const states=[];
 const stop=subscribeTechJobs({load:s=>{signal=s;return new Promise(resolve=>finish=resolve);},onState:s=>states.push(s)});
 stop();assert.equal(signal.aborted,true);finish({jobs:[{id:'old'}],history:[]});await tick();assert.equal(states.length,1);
});
