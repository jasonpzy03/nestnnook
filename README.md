# Nest & Nook

Static Angular + TypeScript website for Nest & Nook room rentals and property management in Johor Bahru. No backend or booking system. Enquiry details exist only in page memory, then go into a WhatsApp message when the visitor chooses to continue; the website does not store them.

## Run locally

Use Node.js 22.12+ (22.x) or a supported newer Node version.

```sh
npm install
npm start
```

Open http://localhost:4200.

## Production

```sh
npm run build
```

Upload the contents of `dist/` to a static web host. All navigation uses page anchors; no server routing is required. If hosting under a subdirectory, build with `npm run build -- --base-href /your-subdirectory/`.

## Content

- `src/site.config.ts`: WhatsApp number and email.
- `src/app.html`: website copy and sections.
- `src/app.ts`: room gallery and WhatsApp enquiry messages.
- `src/rooms.ts`: photo filenames, room types, features and monthly prices, matched to `assets/roominfo.txt`. Update this data when changing room information.
- `src/styles.css`: responsive navy and gold theme.
- `assets/`: original supplied photographs and business card, preserved as provided.

Photos illustrate room types, not bookable inventory. Monthly prices and amenities follow the supplied `assets/roominfo.txt`; individual building assignments and availability are not inferred. R02 has two views; Common Area has no rental price. Fonts load from Google Fonts with local serif/sans-serif fallbacks.

All WhatsApp entry points lead to the enquiry form. Visitors provide a name, one or more preferred room types, a positive whole number of occupants and a location. Location cards prefill the location. The form validates these details and opens WhatsApp directly with an encoded enquiry message. WhatsApp still requires the visitor to press Send. Telegram is temporarily removed from the site.

## SEO and rendering

The production build uses Angular static site generation (SSG/prerendering), not client-only rendering. The full page and contact links are written into `dist/index.html` at build time, then Angular hydrates the page for the menu and gallery. No production Node server or backend is needed. Rebuild after content changes.

The page targets Johor Bahru/JB room rental, CIQ room rental, R&F Princess Cove and Trellis Residences through descriptive titles, visible copy and location headings. It includes business JSON-LD, social-sharing text metadata, image alt text and robots.txt. No invented availability, review ratings or prices are included.

### Vercel deployment and Google Search

1. Set `siteUrl` in `seo.config.json` to the real public HTTPS URL, or supply the `SITE_URL` build environment variable. For a subdirectory, include that path and set the matching Angular base href.
2. Run `npm run build`. This also generates the canonical URL, Open Graph URL and `sitemap.xml`, adds the sitemap to `robots.txt`, and runs SEO checks. With no domain configured, these domain-specific values are deliberately omitted.
3. Deploy `dist/` to public HTTPS static hosting. Ensure the homepage returns HTTP 200, and `/robots.txt`, `/sitemap.xml`, scripts and images are accessible without login. Configure unknown URLs to return a genuine 404, not the homepage.
4. Add a URL-prefix property for `https://nestnnook.vercel.app/` in Google Search Console. Verify ownership with the supplied HTML meta tag in `src/index.html` or verification file in `public/`, redeploy, submit `sitemap.xml`, and use URL Inspection to request indexing of the homepage. Check Google's rendered page and indexing reports after deployment.
5. Keep room information accurate and develop useful, original location content as more property details become available. Avoid duplicate keyword-only landing pages.

`npm run check:seo` checks the latest production output, including prerendered copy and contact links without executing browser JavaScript. The local development server does not run the postbuild SEO metadata generator; inspect production output for canonical, sitemap and JSON-LD checks.

SEO helps search engines understand the site; it does not guarantee indexing, a specific ranking, or first-page placement. Broad building-name searches such as “R&F” have different intent from “R&F Princess Cove room rental”.

The canonical URL is now configured as https://nestnnook.vercel.app/ (without a fragment). A purchased domain is not required. vercel.json sets npm run build and the dist output directory. Redeploy after changes so the new sitemap and metadata reach the public site. Location copy and thumbnail mappings are maintained in src/locations.ts, shared by the cards and enquiry dropdown. Travel times and property claims use the exact information supplied by the business.

## Google reviews

The reviews section links to the supplied Google Maps listing and shows the observed 4.8/5 rating, dated 24 September 2026. It is a static snapshot, not a live reviews feed; recheck it before changing the rating/date. Three selected five-star reviews are stored in src/reviews.ts with reviewer names and direct Google links. Text was verified through the supplied individual review links; Mochi is a marked excerpt. The overall review count was not available and is not displayed. Review content and rating are static snapshots; recheck the original links before updating. No review or aggregate-rating structured data is added for these testimonials.
