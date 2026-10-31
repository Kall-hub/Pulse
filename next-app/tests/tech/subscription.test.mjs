import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribeTechJobs } from '../../src/lib/tech/subscription.mjs';
function setup() {
 let authListener,authStopped=false;const states=[],listeners=[];
 const stop=subscribeTechJobs({watchAuth:listener=>{authListener=listener;return()=>{authStopped=true;};},watchJobs:(next,error)=>{const entry={next,error,stopped:false};listeners.push(entry);return()=>{entry.stopped=true;};},onState:state=>states.push(state)});
 return {auth:user=>authListener(user),states,listeners,stop,authStopped:()=>authStopped};
}
const snapshot=(jobs,cached=false)=>({docs:jobs.map(job=>({id:job.id,data:()=>job})),metadata:{fromCache:cached,hasPendingWrites:false}});
test('waits for restored login and does not present an empty cache as zero live work',()=>{
 const store=setup();assert.equal(store.listeners.length,0);
 store.auth({uid:'office'});assert.equal(store.states.at(-1).phase,'loading');
 store.listeners[0].next(snapshot([],true));assert.equal(store.states.at(-1).phase,'cached');
 store.listeners[0].next(snapshot([{id:'old-card',contractor:'Rasta',status:'active'}]));
 assert.equal(store.states.at(-1).phase,'ready');assert.equal(store.states.at(-1).jobs[0].id,'old-card');
 store.stop();assert.equal(store.authStopped(),true);assert.equal(store.listeners[0].stopped,true);
});
test('permission failures are errors and a restored session starts a new listener',()=>{
 const store=setup();store.auth(null);assert.equal(store.states.at(-1).phase,'signed-out');assert.equal(store.listeners.length,0);
 store.auth({uid:'office'});store.listeners[0].error({code:'permission-denied'});
 assert.equal(store.states.at(-1).phase,'error');assert.match(store.states.at(-1).error,/access/);
 store.auth({uid:'office'});assert.equal(store.listeners[0].stopped,true);
 store.listeners[1].next(snapshot([{id:'rasta-job',status:'active'}]));assert.equal(store.states.at(-1).phase,'ready');
 const count=store.states.length;store.listeners[0].next(snapshot([]));assert.equal(store.states.length,count);
 store.stop();store.listeners[1].next(snapshot([]));assert.equal(store.states.length,count);
});
test('sign-out clears loaded jobs and prevents previous-session callbacks restoring them',()=>{
 const store=setup();store.auth({uid:'office'});store.listeners[0].next(snapshot([{id:'one'}]));store.auth(null);
 assert.equal(store.states.at(-1).phase,'signed-out');assert.deepEqual(store.states.at(-1).jobs,[]);
 store.listeners[0].next(snapshot([{id:'one'}]));assert.equal(store.states.at(-1).phase,'signed-out');store.stop();
});
