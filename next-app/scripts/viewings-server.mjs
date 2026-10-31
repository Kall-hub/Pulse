import http from 'node:http';
import viewings from '../netlify/functions/viewings.mjs';
import action from '../netlify/functions/viewing-action.mjs';
import tenant from '../netlify/functions/tenant-viewing.mjs';
import techJobs from '../netlify/functions/tech-jobs.mjs';

const handlers = new Map([
  ['/.netlify/functions/viewings', viewings],
  ['/.netlify/functions/viewing-action', action],
  ['/.netlify/functions/tenant-viewing', tenant],
  ['/.netlify/functions/tech-jobs', techJobs],
]);

export async function startViewingsServer() {
  const server = http.createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url, 'http://127.0.0.1');
      const handler = handlers.get(url.pathname);
      if (!handler) {
        outgoing.writeHead(404, { 'Content-Type': 'application/json' });
        outgoing.end(JSON.stringify({ error: 'Unknown local function.' }));
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > (url.pathname === '/.netlify/functions/tech-jobs' ? 2500000 : 8192)) throw Object.assign(new Error('Request is too large.'), { status: 413 });
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        for (const item of Array.isArray(value) ? value : [value]) {
          if (item !== undefined) headers.append(key, item);
        }
      }
      const method = incoming.method || 'GET';
      const request = new Request(url, {
        method,
        headers,
        ...(!['GET', 'HEAD'].includes(method) ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await handler(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      outgoing.writeHead(error.status || 500, { 'Content-Type': 'application/json' });
      outgoing.end(JSON.stringify({ error: error.status ? error.message : 'Local function failed. Check the dev terminal.' }));
      if (!error.status) console.error(error);
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { server, port: server.address().port };
}
