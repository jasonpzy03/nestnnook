import { spawnSync } from 'node:child_process';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const target = process.env.DEPLOY_TARGET || 'client';
if (!['client', 'admin'].includes(target))
  throw new Error('DEPLOY_TARGET must be client or admin.');
let apiOrigin;
if (target === 'admin') {
  const url = new URL(process.env.API_ORIGIN || '');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('API_ORIGIN must be the HTTPS API origin, without a path or credentials.');
  }
  apiOrigin = url.origin;
}
const result = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', target === 'admin' ? 'build:admin' : 'build'],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
if (target === 'client') {
  await import('./package-vercel.mjs');
} else {
  const output = new URL('../.vercel/output/', import.meta.url);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(new URL('../.output/admin/', import.meta.url), new URL('static/', output), {
    recursive: true,
  });
  await writeFile(
    new URL('config.json', output),
    JSON.stringify(
      {
        version: 3,
        routes: [
          {
            src: '/api/(.*)',
            dest: `${apiOrigin}/api/$1`,
            headers: { 'Cache-Control': 'no-store' },
          },
          { handle: 'filesystem' },
          { src: '/.*', dest: '/index.html' },
        ],
      },
      null,
      2,
    ),
  );
  console.log('Admin packaged with same-origin API proxy.');
}
