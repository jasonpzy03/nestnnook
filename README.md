# Nest & Nook

Server-rendered Angular + TypeScript client website for Nest & Nook room rentals and property management in Johor Bahru, plus a separate Angular management portal and NestJS API under `apps/`. See [Management application setup](apps/README.md) for admin login, local startup, Upstash configuration and publishing status. The client remains independently deployed; the client reads published catalogue data from NestJS on every page request. Enquiry details exist only in page memory, then go into a WhatsApp message when the visitor chooses to continue; the website does not store them.

## Run locally

Use Node.js 22.12+ (22.x) or a supported newer Node version.

```sh
npm install
npm run start:api
# In separate terminals:
npm run start:admin
npm start
```

Open http://127.0.0.1:4201, save your rooms, then click Publish beside each room. Publish assigned locations first from the Locations page. Open the client at http://127.0.0.1:4200. Both apps must point to the same API. A fresh catalogue shows an empty room collection until rooms are published.

## Production

```sh
npm run build
```

Run `npm run serve:ssr` to serve the production build at http://127.0.0.1:4000. Optionally copy `.env.example` to `.env` at the repository root to configure `CATALOG_API_URL`. The client server needs only the public API URL, never Redis credentials.

Vercel uses `npm run build:vercel` to package static assets and a Node.js SSR function with the Build Output API. Set `CATALOG_API_URL=https://YOUR-API-HOST/api/public/catalog` in the client Vercel project before deploying. Production requires this variable. This is no longer a static-only deployment. Keep the admin as a separate deployment.

## Content

- `src/site.config.ts`: WhatsApp number and email.
- `src/app.html`: website copy and sections.
- `src/app.ts`: room gallery and WhatsApp enquiry messages.
- `src/public-catalog.service.ts`: loads published rooms and locations during SSR, then transfers the same data to the browser for hydration.
- `apps/api/seed/catalog.json`: original catalogue used only to initialise empty storage. Manage subsequent content in the admin portal.
- `src/styles.css`: responsive navy and gold theme.
- `assets/`: original supplied photographs and business card, preserved as provided.

Published rooms now appear as individual listings near the top of the homepage. Visitors can search by room reference, location, features or description; combine location, room-type and monthly-budget filters; and sort by price or recommendation. Each room has one card with controls for its photos. Common Area entries are excluded from rental listings. Rooms without an assigned location show an enquiry prompt rather than an inferred building. Set locations in the admin and publish room changes to make them filterable.

Location cards lead to the filtered listing. Enquiring about a room prefills the room type and location and includes its reference and listed monthly rent in WhatsApp. The full unfiltered listing is server rendered for SEO, and filters run locally without another API request. Published rooms should be unpublished when no longer available. Existing seed records with duplicate views remain separate records until consolidated in the admin; no business data is merged automatically.

All WhatsApp entry points lead to the enquiry form. Visitors provide a name, one or more preferred room types, a positive whole number of occupants and a location. Location cards prefill the location. The form validates these details and opens WhatsApp directly with an encoded enquiry message. WhatsApp still requires the visitor to press Send. Telegram is temporarily removed from the site.

## SEO and rendering

The public website uses request-time Angular SSR. NestJS reads the published snapshot from local storage or Upstash; drafts remain private until Publish is clicked. Publishing does not rebuild or redeploy the website. HTML and catalogue responses use `Cache-Control: no-store` initially so the next request receives the new publication. Each browser receives its initial catalogue via Angular TransferState, without a second browser API fetch. Existing open pages update on reload.

The build generates the HTML template and SEO metadata without contacting the API. On API errors, the server returns HTTP 503 with Retry-After, never old hardcoded room prices. An intentionally empty published catalogue remains valid. Unknown URLs return 404.

The page targets Johor Bahru/JB room rental, CIQ room rental, R&F Princess Cove and Trellis Residences through descriptive titles, visible copy and location headings. It includes business JSON-LD, social-sharing text metadata, image alt text and robots.txt. No invented availability, review ratings or prices are included.

### Vercel deployment and Google Search

1. Set `siteUrl` in `seo.config.json` to the real public HTTPS URL, or supply the `SITE_URL` build environment variable. For a subdirectory, include that path and set the matching Angular base href.
2. Run `npm run build`. This also generates the canonical URL, Open Graph URL and `sitemap.xml`, adds the sitemap to `robots.txt`, and prepares the SSR template. With no domain configured, these domain-specific values are deliberately omitted.
3. Deploy using the included Vercel SSR configuration and set the public API URL. Ensure the homepage returns HTTP 200, and `/robots.txt`, `/sitemap.xml`, scripts and images are accessible without login. Configure unknown URLs to return a genuine 404, not the homepage.
4. Add a URL-prefix property for `https://nestnnook.vercel.app/` in Google Search Console. Verify ownership with the supplied HTML meta tag in `src/index.html` or verification file in `public/`, redeploy, submit `sitemap.xml`, and use URL Inspection to request indexing of the homepage. Check Google's rendered page and indexing reports after deployment.
5. Keep room information accurate and develop useful, original location content as more property details become available. Avoid duplicate keyword-only landing pages.

`npm run test:ssr` tests the built SSR server against an isolated API fixture, including price changes without rebuilding, hydration data, SEO, empty catalogues and failure responses. `npm run check:seo` checks a running production server at `http://127.0.0.1:4000` (override with `SEO_URL`). The local development server does not run the postbuild SEO metadata generator; inspect production output for canonical, sitemap and JSON-LD checks.

SEO helps search engines understand the site; it does not guarantee indexing, a specific ranking, or first-page placement. Broad building-name searches such as “R&F” have different intent from “R&F Princess Cove room rental”.

The canonical URL is now configured as https://nestnnook.vercel.app/ (without a fragment). A purchased domain is not required. vercel.json builds the Vercel SSR function. Redeploy code and SEO metadata changes; room and location edits only require Publish in the admin portal. Locations feed both the cards and enquiry dropdown. Travel times and property claims use the exact information supplied by the business.

## Google reviews

The reviews section links to the supplied Google Maps listing and shows the observed 4.8/5 rating, dated 24 September 2026. It is a static snapshot, not a live reviews feed; recheck it before changing the rating/date. Three selected five-star reviews are stored in src/reviews.ts with reviewer names and direct Google links. Text was verified through the supplied individual review links; Mochi is a marked excerpt. The overall review count was not available and is not displayed. Review content and rating are static snapshots; recheck the original links before updating. No review or aggregate-rating structured data is added for these testimonials.

### Production room photo uploads

Create a **public** Vercel Blob store and connect it to the **API** project. Set `BLOB_READ_WRITE_TOKEN` in the API project environment, then redeploy both API and admin. Keep the token out of the Angular apps. Uploads accept JPEG, PNG and WebP up to 4 MB; the authenticated API validates image signatures and returns a public Blob URL, which is stored with the room in Upstash. Save the room and publish it to show the photo publicly. Uploaded photos are public by URL even before the room is published.

For local Blob uploads, add the token to `apps/api/.env` and restart the API. Without a Blob token, local filesystem uploads remain available only with `ALLOW_LOCAL_UPLOADS=true` outside production and Vercel. Removing a photo from a room does not delete its Blob file; delete unused files separately only after ensuring no published room uses them.
