import test from 'node:test';
import assert from 'node:assert/strict';
import { tenantRequest } from '../../src/lib/viewings/tenantRequest.mjs';
test('client sends its action and latest revision and receives the saved response', async () => {
 const saved = { status: 'Confirmed', tenantResponse: { action: 'kept-original' } };
 const result = await tenantRequest('private', { action: 'confirm', revision: 4 }, { fetcher: async (url, options) => {
  assert.equal(url, '/.netlify/functions/tenant-viewing');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Authorization, 'Bearer private');
  assert.deepEqual(JSON.parse(options.body), { action: 'confirm', revision: 4 });
  return Response.json({ viewing: saved });
 } });
 assert.deepEqual(result, saved);
});
test('server errors and invalid success responses cannot appear as a sent confirmation', async () => {
 await assert.rejects(tenantRequest('private', {}, { fetcher: async () => Response.json({ error: 'Your booking changed. Refresh.' }, { status: 409 }) }), /booking changed/);
 await assert.rejects(tenantRequest('private', {}, { fetcher: async () => new Response('<html>Oops</html>') }), /unexpected response/);
 await assert.rejects(tenantRequest('private', {}, { fetcher: async () => Response.json({}) }), /No booking confirmation/);
});
test('slow connections stop waiting and tell the client to check saved status', async () => {
 await assert.rejects(tenantRequest('private', {}, { timeout: 5, fetcher: (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))) }), /may have been saved.*Refresh/);
});
