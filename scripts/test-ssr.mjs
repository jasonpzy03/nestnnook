import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const seed = JSON.parse(
  await readFile(new URL('../apps/api/seed/catalog.json', import.meta.url), 'utf8'),
);
let catalog = { rooms: seed.rooms, locations: seed.locations };
catalog.rooms[0].locationId = catalog.locations[0].id;
catalog.rooms[0].photos.push({ url: '/assets/R03.jpg', alt: 'Second photo of the same room' });
let unavailable = false;
let requests = 0;
const api = createServer((req, res) => {
  requests++;
  res.writeHead(unavailable ? 503 : 200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(catalog));
});
api.listen(0, '127.0.0.1');
await once(api, 'listening');
process.env.CATALOG_API_URL = `http://127.0.0.1:${api.address().port}/api/public/catalog`;
process.env.NODE_ENV = 'production';
const entry = process.env.SSR_ENTRY || '../dist/server/server.mjs';
const module = await import(entry);
const reqHandler = module.reqHandler || module.default;
const server = createServer(reqHandler);
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
function assertBlockingStyles(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  const styles = (head.match(/<link\b[^>]*>/gi) || []).filter((link) =>
    /rel="stylesheet"/i.test(link),
  );
  assert.ok(styles.length > 0, 'SSR must include a stylesheet in the document head');
  for (const link of styles) {
    assert.ok(
      !/media="(?!all")[^"]*"|onload=/i.test(link),
      'SSR styles must block first paint instead of waiting for an onload handler',
    );
  }
}
try {
  let response = await fetch(base);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  let html = await response.text();
  assertBlockingStyles(html);
  assert.match(html, /1,688/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /ngh=/);
  assert.match(html, /published-catalog/);
  assert.match(html, /Rooms to call home\./);
  assert.equal(
    (html.match(/class="listing-card"/g) || []).length,
    catalog.rooms.filter((room) => room.type !== 'Common Area' && room.photos.length).length,
    'One listing per room, not per photo; shared spaces are not rentable listings',
  );
  assert.match(html, /Next photo/);
  assert.ok(!html.includes('UPSTASH_REDIS_REST_TOKEN'));
  catalog.rooms[0].monthlyRent = 2345;
  catalog.rooms[0].code = 'SSR-UPDATED';
  catalog.locations[0].name = 'Updated location';
  html = await (await fetch(base)).text();
  assertBlockingStyles(html);
  assert.match(html, /2,345/);
  assert.match(html, /SSR-UPDATED/);
  assert.match(html, /Updated location/);
  assert.equal(requests, 2, 'Each request must read the latest published catalogue');
  assert.equal((await fetch(base + '/missing')).status, 404);
  assert.equal((await fetch(base + '/index.csr.html')).status, 404);
  if (!process.env.SSR_ENTRY) assert.equal((await fetch(base + '/robots.txt')).status, 200);
  const seo = spawn(process.execPath, ['scripts/check-seo.mjs'], {
    env: { ...process.env, SEO_URL: base },
    stdio: 'inherit',
  });
  assert.equal((await once(seo, 'exit'))[0], 0);
  catalog = { rooms: [], locations: [] };
  response = await fetch(base);
  assert.equal(response.status, 200, 'An intentionally empty catalogue is valid');
  assert.ok(!(await response.text()).includes('SSR-UPDATED'));
  unavailable = true;
  response = await fetch(base);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.ok(!(await response.text()).includes('1,688'));
  console.log(
    'SSR checks passed: fresh HTML, hydration state, metadata, empty catalogue, 404s and API failure.',
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  server.closeAllConnections();
  api.closeAllConnections();
  await Promise.all([
    new Promise((resolve) => server.close(resolve)),
    new Promise((resolve) => api.close(resolve)),
  ]);
}
