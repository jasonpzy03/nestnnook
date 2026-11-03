import {
  AngularNodeAppEngine,
  CommonEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';
import { RENDER_REQUEST } from './public-catalog.service';

const browser = resolve(dirname(fileURLToPath(import.meta.url)), '../browser');
// Rendering uses a fixed internal URL; forwarded host headers never control it.
const engine = new CommonEngine({ allowedHosts: ['localhost'] });
let developmentEngine: AngularNodeAppEngine | undefined;
const mime: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export const reqHandler = createNodeRequestHandler(
  async (req, res, next?: (error?: unknown) => void) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      // Angular CLI supplies middleware `next` and keeps its templates in memory.
      // The standalone/Vercel server instead reads the production SEO template below.
      if (next) {
        developmentEngine ??= new AngularNodeAppEngine();
        const response = await developmentEngine.handle(req);
        if (response) await writeResponseToNodeResponse(response, res);
        else next();
        return;
      }
      const url = new URL(req.url || '/', 'http://localhost');
      if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
        res.writeHead(405).end();
        return;
      }
      if (url.pathname !== '/') {
        const file = resolve(browser, '.' + decodeURIComponent(url.pathname));
        if (file.startsWith(browser + sep) && mime[extname(file)]) {
          try {
            const data = await readFile(file);
            res.setHeader('Content-Type', mime[extname(file)]);
            res.end(req.method === 'HEAD' ? undefined : data);
            return;
          } catch {
            /* Unknown static file returns 404. */
          }
        }
        res.writeHead(404).end('Not found');
        return;
      }
      const api =
        process.env['CATALOG_API_URL'] ||
        (process.env['NODE_ENV'] !== 'production'
          ? 'http://127.0.0.1:3000/api/public/catalog'
          : '');
      if (!api) throw new Error('CATALOG_API_URL is required in production.');
      const html = await engine.render({
        bootstrap,
        documentFilePath: resolve(browser, 'index.csr.html'),
        url: 'http://localhost/',
        publicPath: browser,
        inlineCriticalCss: false,
        providers: [{ provide: RENDER_REQUEST, useValue: true }],
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(req.method === 'HEAD' ? undefined : html);
    } catch (error) {
      console.error(
        'SSR request failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      // Never serve stale hardcoded prices or a successful empty page on API failure.
      res.setHeader('Retry-After', '60');
      res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<!doctype html><html lang="en"><title>Temporarily unavailable | Nest &amp; Nook</title><h1>We’ll be back shortly.</h1><p>Please try again in a moment.</p></html>',
      );
    }
  },
);

if (isMainModule(import.meta.url)) {
  // Node supplies two arguments; only Angular's development middleware supplies `next`.
  createServer((req, res) => {
    void reqHandler(req, res);
  }).listen(Number(process.env['PORT'] || 4000), () =>
    console.log('Nest & Nook SSR server started.'),
  );
}
