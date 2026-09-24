import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Use the site's actual featured rooms, rather than duplicating changing prices.
const roomSource = await readFile(new URL('../src/rooms.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(roomSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
});
const { FEATURED_ROOMS } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const body = html.split('<body>')[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
for (const text of ['Johor Bahru room rental', 'CIQ room rental', 'JB room rental', 'Princess Cove', 'Trellis Residences', 'id="enquiry"', 'Tri Tower', 'Country Garden Danga Bay', 'Common Room', 'Balcony Room', 'Window Room', 'Master Room']) {
  assert.ok(body.replace(/\s+/g, ' ').includes(text), `Missing prerendered page content: ${text}`);
}
const roomCards = [...body.matchAll(/<a\b[^>]*class="[^"]*\broom-card\b[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];
assert.equal(roomCards.length, FEATURED_ROOMS.length, 'All featured room cards must be prerendered');
for (const [index, room] of FEATURED_ROOMS.entries()) {
  const card = roomCards[index][1].replace(/\s+/g, ' ');
  for (const text of [room.code, room.type, room.price].filter(Boolean)) {
    assert.ok(card.includes(text), `Missing prerendered room content for ${room.code}: ${text}`);
  }
}
assert.equal((body.match(/<h1\b/g) || []).length, 1, 'Exactly one primary heading is required');
assert.ok(!/t\.me\/|telegram/i.test(html), 'Telegram must not appear in the published page');
assert.ok(html.includes('ngh='), 'Angular hydration markers must be present');
assert.ok(html.includes('name="description"'), 'Description metadata is required');
assert.ok(!html.includes('noindex'), 'Production page must allow indexing');
const structured = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
assert.equal(structured.length, 1);
const business = JSON.parse(structured[0][1]);
assert.equal(business.name, 'Nest & Nook');
assert.equal(business.telephone, '+601113380335');
const config = JSON.parse(await readFile(new URL('../seo.config.json', import.meta.url), 'utf8'));
const configuredUrl = process.env.SITE_URL || config.siteUrl;
const robots = await readFile(new URL('../dist/robots.txt', import.meta.url), 'utf8');
assert.ok(robots.includes('Allow: /'));
if (configuredUrl) {
  const url = new URL(configuredUrl).href.replace(/\/+$/, '') + '/';
  assert.equal(business.url, url);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(robots.includes(`Sitemap: ${url}sitemap.xml`));
  const sitemap = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  assert.ok(sitemap.includes(`<loc>${url}</loc>`));
} else {
  assert.ok(!html.includes('rel="canonical"'), 'Do not invent a production domain');
  assert.ok(!robots.includes('Sitemap:'));
}
console.log('SEO checks passed: full HTML content, hydration, contact links, metadata, structured data and domain configuration.');
