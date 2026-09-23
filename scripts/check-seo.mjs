import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const body = html.split('<body>')[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
for (const text of ['Johor Bahru room rental', 'CIQ room rental', 'JB room rental', 'Princess Cove', 'Trellis Residences', 'id="enquiry"', 'Tri Tower', 'Country Garden Danga Bay', 'Common Room', 'Balcony Room', 'Window Room', 'Master Room', '1,288', '1,488', '988', '1,788']) {
  assert.ok(body.replace(/\s+/g, ' ').includes(text), `Missing prerendered page content: ${text}`);
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
