import { cp, mkdir, writeFile, rm } from 'node:fs/promises';

// Build Output API: static assets on the CDN, homepage in a Node function.
const output = new URL('../.vercel/output/', import.meta.url);
await rm(output, { recursive: true, force: true });
const fn = new URL('functions/render.func/', output);
await mkdir(fn, { recursive: true });
await cp(new URL('../dist/browser/', import.meta.url), new URL('static/', output), {
  recursive: true,
});
await rm(new URL('static/index.csr.html', output), { force: true });
await cp(new URL('../dist/server/', import.meta.url), new URL('server/', fn), { recursive: true });
await mkdir(new URL('browser/', fn), { recursive: true });
await cp(
  new URL('../dist/browser/index.csr.html', import.meta.url),
  new URL('browser/index.csr.html', fn),
);
await writeFile(
  new URL('index.mjs', fn),
  "export { reqHandler as default } from './server/server.mjs';\n",
);
await writeFile(
  new URL('.vc-config.json', fn),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs' }),
);
await writeFile(
  new URL('config.json', output),
  JSON.stringify({
    version: 3,
    routes: [
      { src: '^/$', dest: '/render' },
      { handle: 'filesystem' },
      { src: '/.*', status: 404, dest: '/404.html' },
    ],
  }),
);
await writeFile(
  new URL('static/404.html', output),
  '<!doctype html><title>Not found</title><h1>Page not found</h1>',
);
console.log('Vercel SSR function and static assets packaged.');
