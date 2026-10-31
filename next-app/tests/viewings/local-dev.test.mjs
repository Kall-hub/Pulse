import test from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '../../next.config.mjs';
import { startViewingsServer } from '../../scripts/viewings-server.mjs';

test('local dev starts the actual Netlify handlers over HTTP', async () => {
  const { server, port } = await startViewingsServer();
  try {
    for (const name of ['viewings', 'tenant-viewing']) {
      const r = await fetch(`http://127.0.0.1:${port}/.netlify/functions/${name}`);
      assert.equal(r.status, 401);
      assert.match(r.headers.get('content-type'), /application\/json/);
      assert.ok((await r.json()).error);
    }
    const r = await fetch(`http://127.0.0.1:${port}/.netlify/functions/missing`);
    assert.equal(r.status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
test('production remains a static export; development proxies functions', async () => {
  const production = nextConfig('phase-production-build');
  assert.equal(production.output, 'export');
  assert.equal(production.rewrites, undefined);
  const development = nextConfig('phase-development-server');
  assert.equal(development.output, undefined);
  const [rewrite] = await development.rewrites();
  assert.equal(rewrite.source, '/.netlify/functions/:path*');
  assert.match(rewrite.destination, /^http:\/\/127\.0\.0\.1:\d+\//);
});
test('missing Firebase settings give an actionable configuration response', async () => {
  const names = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
  const original = names.map(name => process.env[name]);
  names.forEach(name => delete process.env[name]);
  const { server, port } = await startViewingsServer();
  try {
    const r = await fetch(`http://127.0.0.1:${port}/.netlify/functions/viewings`, { headers: { authorization: 'Bearer configuration-test' } });
    assert.equal(r.status, 503);
    assert.match((await r.json()).error, /Firebase server settings are missing/);
  } finally {
    names.forEach((name, i) => { if (original[i] === undefined) delete process.env[name]; else process.env[name] = original[i]; });
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
