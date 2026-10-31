import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startViewingsServer } from './viewings-server.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(root, true);
const { server, port } = await startViewingsServer();
console.log(`Viewings functions ready locally on 127.0.0.1:${port}`);
const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'VIEWING_LINK_SECRET', 'VIEWING_AGENT_UIDS'];
const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) console.warn(`Viewings setup needed in .env.local: ${missing.join(', ')}. See VIEWINGS_SETUP.md. Do not paste secrets into chat.`);

const next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--turbopack', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, VIEWINGS_API_PORT: String(port) },
});
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  server.close();
  if (process.platform === 'win32' && next.pid) {
    const killer = spawn('taskkill', ['/PID', String(next.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    killer.on('error', () => next.kill());
  } else next.kill('SIGTERM');
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
next.on('error', error => { console.error(error); server.close(); process.exitCode = 1; });
next.on('exit', code => { server.close(); process.exitCode = stopping ? 0 : code || 0; });
