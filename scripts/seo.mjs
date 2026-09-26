import { readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(resolve(root, 'seo.config.json'), 'utf8'));
const configuredUrl = process.env.SITE_URL || config.siteUrl;
let siteUrl;
if (configuredUrl) {
  const parsed = new URL(configuredUrl);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash ||
      /^(localhost|127\.|\[::1\])/.test(parsed.hostname) || !parsed.hostname.includes('.')) {
    throw new Error('SITE_URL must be the public HTTPS website URL, without credentials, query parameters or fragments.');
  }
  siteUrl = parsed.href.replace(/\/+$/, '') + '/';
}

const output = resolve(root, 'dist');
// Static hosting needs only the prerendered document; avoid publishing a duplicate CSR page.
await rm(resolve(output, 'index.csr.html'), { force: true });
const htmlPath = resolve(output, 'index.html');
let html = await readFile(htmlPath, 'utf8');
// Permit rerunning metadata generation on the same build.
html = html.replace(/\n?<!-- generated-seo -->[\s\S]*?<!-- \/generated-seo -->\n?/g, '');
const contactSource = await readFile(resolve(root, 'src/site.config.ts'), 'utf8');
const contactField = (name) => {
  const value = contactSource.match(new RegExp(`${name}:\\s*'([^']+)'`))?.[1];
  if (!value) throw new Error(`Missing ${name} in src/site.config.ts`);
  return value;
};
const business = {
  '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: 'Nest & Nook',
  description: 'Property management and room rentals in Johor Bahru, including R&F Princess Cove, Trellis Residences and locations near CIQ.',
  telephone: '+' + contactField('whatsappNumber'), email: contactField('email'),
  address: { '@type': 'PostalAddress', addressLocality: 'Johor Bahru', addressRegion: 'Johor', addressCountry: 'MY' },
  areaServed: { '@type': 'City', name: 'Johor Bahru' },
  ...(siteUrl ? { '@id': siteUrl + '#business', url: siteUrl } : {})
};
const escapeXml = (value) => value.replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
let metadata = `<script type="application/ld+json">${JSON.stringify(business).replace(/</g, '\\u003c')}</script>`;
let robots = 'User-agent: *\nAllow: /\n';
if (siteUrl) {
  const website = {
    '@context': 'https://schema.org', '@type': 'WebSite',
    '@id': siteUrl + '#website',
    name: business.name,
    alternateName: 'Nest and Nook',
    url: siteUrl,
    publisher: { '@id': business['@id'] }
  };
  metadata += `\n<script type="application/ld+json">${JSON.stringify(website).replace(/</g, '\\u003c')}</script>`;
  metadata += `\n<link rel="canonical" href="${escapeXml(siteUrl)}">\n<meta property="og:url" content="${escapeXml(siteUrl)}">`;
  await writeFile(resolve(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeXml(siteUrl)}</loc></url></urlset>\n`);
  robots += `\nSitemap: ${siteUrl}sitemap.xml\n`;
} else {
  await rm(resolve(output, 'sitemap.xml'), { force: true });
  console.warn('SEO: No public domain configured. Set siteUrl in seo.config.json or SITE_URL before deployment to generate the canonical URL and sitemap.');
}
html = html.replace('</head>', `<!-- generated-seo -->\n${metadata}\n<!-- /generated-seo -->\n</head>`);
await writeFile(htmlPath, html);
await writeFile(resolve(output, 'robots.txt'), robots);
console.log('SEO: Added business structured data and robots.txt' + (siteUrl ? ', WebSite structured data, canonical URL and sitemap.' : '.'));
