# Management applications

The client website remains in the root `src/` folder. The new admin and API are separate applications: neither imports client components. The API exposes only the published catalogue to the client SSR server. The Angular CLI workspace shares frontend dependencies, but each app has its own entry point, styles, TypeScript scope, and output directory.

```text
src/                          Public Angular SSR client
apps/
  admin/
    src/app/core/             API service and admin types
    src/app/features/rooms/   Room editor and photo controls
    src/app/features/locations/ Location editor
    src/app/shared/           Admin icons
    src/app/app.component.*   Workspace navigation, dashboard and catalogue views
    src/styles.css            Separate navy/gold admin theme
    proxy.conf.json           Development-only API proxy
  api/
    src/auth/                 Login, sessions, access guard, rate limiting
    src/catalog/              Validation, catalogue CRUD and publication
    src/storage/              Upstash Redis and local development storage
    src/media/                Validated local image uploads
    seed/catalog.json         One-time copy of existing rooms and locations
    scripts/                  Local account setup
    test/                     Isolated HTTP integration tests
```

## Run locally

From the repository root:

```sh
npm ci
npm --prefix apps/api ci
npm run setup:api
```

Setup creates a unique local administrator password and writes it to `apps/api/.data/local-login.txt`. Both `.env` and `.data` are ignored by Git. Setup refuses to overwrite an existing account. This installation has already been set up; do not run setup again unless starting with a new checkout.

Start the API and admin in separate terminals:

```sh
npm run start:api
npm run start:admin
```

Open **http://127.0.0.1:4201/** (use this hostname, not `localhost`, to match the allowed request origin). API: `http://127.0.0.1:3000`. The API command compiles before starting; restart it after backend edits. Angular supports live reload.

`npm start` continues to run the client on port 4200. `npm run build` still builds only the client into `dist/` for the existing Vercel project. Admin output is `.output/admin/`, never inside the client deployment.

## Included workflows

- Password-protected admin with HttpOnly, SameSite cookies, 8-hour sessions, logout revocation, login throttling and request-origin validation. Production cookies use Secure.
- Search rooms by reference/type/location; filter by type, location and visibility.
- Create/edit/delete room entries, prices, descriptions, features and location assignments. Unpublish rooms without deleting them; mark featured rooms and set display order.
- Add up to 12 images per room, reorder cover images, edit alt text, remove image references, or upload JPEG/PNG/WebP up to 5 MB locally.
- Create/edit/delete locations. A location cannot be deleted while rooms reference it.
- Export the draft catalogue as JSON for backup.
- Publish, update or unpublish each room independently. Locations have their own publishing actions.
- The current room/location list is imported only when a store has no catalogue. No room-to-building assignments are invented.

Saving changes keeps them as drafts. Each room row has **Publish**, **Publish changes** and **Unpublish** actions, with Draft / Published / Unpublished changes status. Locations have the same controls. Publishing one entry atomically updates only that entry in the public snapshot; unrelated edits remain drafts. Existing published content is preserved on upgrade.

Publish a room's assigned location first. A location cannot be unpublished while published rooms reference it: unpublish those rooms or publish their reassignment first. Unpublish an entry before deleting it. The legacy `visible` field is retained for storage compatibility but no longer controls publishing.

`GET /api/public/catalog` returns only published entries, or empty collections before the first publication. The client SSR server fetches this endpoint on each page request. No deploy hook or client rebuild is involved. Existing browser tabs see changes after reload. API actions are `POST /api/catalog/rooms/:id/publish` and `/unpublish`, and equivalent `/locations/:id/` routes; all require authentication and the current catalogue revision. The old bulk-publish route has been removed.

The admin login requires only a password. `ADMIN_PASSWORD_HASH` configures it; `ADMIN_EMAIL` is no longer used. Existing password hashes and sessions remain valid. Deploy both admin and API updates together.

## Connecting Upstash

Set these only in the backend's private `.env` or hosting environment:

```dotenv
STORAGE_DRIVER=upstash
UPSTASH_REDIS_REST_URL=https://YOUR-DATABASE.upstash.io
UPSTASH_REDIS_REST_TOKEN=YOUR-PRIVATE-REST-TOKEN
REDIS_KEY_PREFIX=nestnnook
```

Restart the API. The workspace badge will indicate Upstash after a successful read. No credentials are shipped to Angular. Real Upstash connectivity cannot be verified until credentials are configured.

The catalogue uses a versioned JSON document at `nestnnook:catalog:v1`. Updates use an atomic Lua compare-and-swap against the expected revision so a stale editor receives a 409 instead of silently overwriting data. Sessions and login rate limits use separate expiring Redis keys. This design is intended for a small room catalogue (up to 1,000 entries), not unlimited inventory. The API's normal JSON request limit also applies.

Local changes are **not automatically migrated** when switching stores. The local file stays in `.data/catalog.json`; export it before switching if you need those edits preserved. An empty Upstash store starts from `seed/catalog.json`. Production storage should have appropriate persistence/backups configured; use catalogue exports as an additional backup.

## Deployment and image storage

The production admin should be served with `/api/*` reverse-proxied to NestJS on the **same origin**, with `ADMIN_ORIGIN` set to that HTTPS origin. Do not enable wildcard CORS. Protect the API with its server-side guard; `noindex` and `robots.txt` only control indexing, not access. There is no public signup or password recovery flow in this first version.

Use a dedicated production admin account/hash, `NODE_ENV=production`, Upstash and HTTPS. If adding a proxy, configure trusted proxy hops narrowly so login limiting can distinguish clients; do not trust arbitrary forwarded IP headers.

Redis stores image references, not image binaries. Local uploads are development-only and stay in `apps/api/.data/uploads/`; removing a photo from a room removes its reference, not the file. Production upload storage needs to be selected (for example, an object-storage bucket); until then, use hosted HTTPS image URLs. No deployment, cloud account or image storage has been created automatically. Deploy hooks are not used.

## Checks

```sh
npm run build:admin
npm run test:api
npm run build
npm run test:ssr
npm run format:check
```

API tests create and remove an isolated temporary catalogue and never edit the local working catalogue or contact Upstash. They cover session protection, cross-origin rejection, input validation, room CRUD, individual publishing, draft isolation, location dependencies, stale-write protection, upload checks, logout and login rate limiting.
