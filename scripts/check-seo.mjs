import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const response = await fetch(process.env.SEO_URL || 'http://127.0.0.1:4000/');
assert.equal(response.status, 200, 'SSR homepage must return HTTP 200');
const html = await response.text();
const body = html.split(/<body\b[^>]*>/)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
for (const text of [
  'Johor Bahru room rental',
  'CIQ room rental',
  'JB room rental',
  'Princess Cove',
  'Trellis Residences',
  'id="enquiry"',
  'Common Room',
  'Balcony Room',
  'Window Room',
  'Master Room',
]) {
  assert.ok(
    body.replace(/\s+/g, ' ').includes(text),
    `Missing server-rendered page content: ${text}`,
  );
}
// Room prices and card counts are managed data, not fixed SEO requirements.
assert.equal((body.match(/<h1\b/g) || []).length, 1, 'Exactly one primary heading is required');
assert.ok(!/t\.me\/|telegram/i.test(html), 'Telegram must not appear in the published page');
assert.ok(html.includes('ngh='), 'Angular hydration markers must be present');
assert.ok(html.includes('name="description"'), 'Description metadata is required');
assert.ok(!html.includes('noindex'), 'Production page must allow indexing');
const structured = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
const entities = structured.map((match) => JSON.parse(match[1]));
const businesses = entities.filter((entity) => entity['@type'] === 'RealEstateAgent');
const websites = entities.filter((entity) => entity['@type'] === 'WebSite');
assert.equal(businesses.length, 1, 'Exactly one business entity is required');
const business = businesses[0];
assert.equal(business.name, 'Nest & Nook');
assert.equal(business.telephone, '+601113380335');
const config = JSON.parse(await readFile(new URL('../seo.config.json', import.meta.url), 'utf8'));
const configuredUrl = process.env.SITE_URL || config.siteUrl;
const robots = await readFile(new URL('../dist/browser/robots.txt', import.meta.url), 'utf8');
assert.ok(robots.includes('Allow: /'));
if (configuredUrl) {
  const url = new URL(configuredUrl).href.replace(/\/+$/, '') + '/';
  assert.equal(business.url, url);
  assert.equal(websites.length, 1, 'Exactly one WebSite entity is required');
  assert.equal(websites[0].name, 'Nest & Nook');
  assert.equal(websites[0].alternateName, 'Nest and Nook');
  assert.equal(websites[0].url, url);
  assert.equal(websites[0]['@id'], url + '#website');
  assert.equal(websites[0].publisher['@id'], business['@id']);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(robots.includes(`Sitemap: ${url}sitemap.xml`));
  const sitemap = await readFile(new URL('../dist/browser/sitemap.xml', import.meta.url), 'utf8');
  assert.ok(sitemap.includes(`<loc>${url}</loc>`));
} else {
  assert.equal(websites.length, 0, 'Do not invent a website URL');
  assert.ok(!html.includes('rel="canonical"'), 'Do not invent a production domain');
  assert.ok(!robots.includes('Sitemap:'));
}
console.log(
  'SEO checks passed: full HTML content, hydration, contact links, metadata, structured data and domain configuration.',
);
