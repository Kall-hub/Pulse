import test from 'node:test';
import assert from 'node:assert/strict';
import viewings from '../../netlify/functions/viewings.mjs';
import action from '../../netlify/functions/viewing-action.mjs';
import tenant from '../../netlify/functions/tenant-viewing.mjs';

// Route guards run without any Firebase credentials or network access.
test('staff routes reject unsigned requests before accessing Firebase', async () => {
  for (const [handler,url,method] of [[viewings,'viewings','GET'],[viewings,'viewings','POST'],[action,'viewing-action?id=booking123','POST']]) {
    const r=await handler(new Request(`https://pulse.example/.netlify/functions/${url}`,{method}));
    assert.equal(r.status,401); assert.match((await r.json()).error,/sign in/i);
  }
});
test('tenant route rejects missing or malformed capability links', async () => {
  for (const method of ['GET','POST']) {
    const r=await tenant(new Request('https://pulse.example/.netlify/functions/tenant-viewing',{method}));
    assert.equal(r.status,401);
  }
});
test('unsupported methods return 405 with a JSON response', async () => {
  for(const handler of [viewings,action,tenant]) {
    const r=await handler(new Request('https://pulse.example/.netlify/functions/viewings',{method:'DELETE'}));
    assert.equal(r.status,405); assert.match(r.headers.get('content-type'),/application\/json/);
  }
});
