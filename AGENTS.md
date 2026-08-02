# Agent Working Rules

## Before every commit

After making changes from a prompt and BEFORE committing:

1. Author new tests covering the changes being made.
2. Update any documentation affected by the changes (README.md, this file).
3. Run `pnpm format-and-validate` and repair any regressions in-line. This includes the Playwright e2e suite — never skip it; web apps regress on e2e easily.

If Playwright's browser is missing, install it with `pnpm exec playwright install chromium` rather than skipping e2e.

## Git conventions

- Small, modular commits: one logical unit per commit.
- Never commit `.env`, `pb_data/`, or `pb_public/` (build artifact).

## Architecture

- **Frontend**: Vite + React SPA. The production build outputs to `pb_public/`, which PocketBase serves directly (with `index.html` fallback for client-side routing).
- **Backend**: PocketBase hosted on PocketHost at `https://daythatworks.pockethost.io`. There is no custom server — server-side logic lives in `pb_hooks/` (PocketBase JSVM) and schema in `pb_migrations/`.
- The PocketBase client singleton is `src/lib/pocketbase.ts`; generated record types are `src/lib/pocketbase-types.ts`.
- UI primitives live at `src/components/ui/` (button, input, label, card). Pages import from there — keep that contract if you add or swap components.

## PocketHost workflow

phio is the PocketHost CLI (`npm install -g phio tsx`; requires Node 24+ — phio's launcher needs a global tsx).

- `phio dev` — watch-sync `pb_*` files to the instance while developing.
- `pnpm build && phio deploy` — build and deploy.
- `phio logs` — stream instance logs.
- Schema changes go in `pb_migrations/` (auto-run on instance restart). After schema changes, run `pnpm typegen` (needs `PB_TYPEGEN_URL`, `PB_TYPEGEN_EMAIL`, `PB_TYPEGEN_PASSWORD` env vars) and commit the regenerated types.
- Secrets (OAuth client IDs, API keys) belong in the PocketHost dashboard (Secrets), surfaced to hooks/migrations via `$os.getenv(...)`. Never hardcode them.
- CI deploys use `PHIO_USERNAME`, `PHIO_PASSWORD`, `PHIO_INSTANCE_NAME` env vars with `phio deploy`.

## Constraints

- PocketHost serves only static files (`pb_public/`), hooks (`pb_hooks/`), and migrations (`pb_migrations/`) — no custom server processes. Don't add SSR or API routes that assume a Node server.
- `pb_hooks/` runs in PocketBase's JSVM (ES5-ish + PocketBase globals, no npm imports). Keep hooks dependency-free. Handler callbacks cannot close over top-level file scope — shared helpers live in `pb_hooks/lib/*.js` and are `require()`d inside each handler.

## App invariants

- `events` and `submissions` use client-supplied 26-char lowercased ULID ids (`newId()` in `src/lib/id.ts`); event slugs are optional and unique only among non-empty values (the form checks availability on blur via `isSlugTaken` in `src/lib/events.ts`; the partial unique index is the backstop).
- Event images are either the uploaded `image` file or the external `imageUrl` text field (http/https, validated by the field pattern in `pb_migrations/1700000008_event_image_url.js`); `imageUrl` wins when both exist — EventPage and `og.js` (`resolveOgImage`) both prefer it. The form (`ImageDropzone`) verifies links client-side and clears whichever field the user switched away from.
- `pb_hooks/records.pb.js` is the source of truth for write-time validation (≥2 valid dates per event, submission dates ⊆ event dates), stamps `creator*`/`submitter*` fields from the authenticated user, and hides emails (and names on `hideNames` events) from other users via `onRecordEnrich`. Don't rely on client-sent identity fields.
- Local development runs a local `pocketbase serve` with the dev-only `/api/dev-login` route (`DEV_AUTH=true` + `DEV_AUTH_NAME`/`DEV_AUTH_EMAIL` env; `VITE_DEV_AUTH=true` shows the button). Never enable `DEV_AUTH` on PocketHost.
- `DEV_AUTH=true` also seeds `/events/test` (pb_hooks/dev-seed.pb.js + lib/dev-seed.js): idempotent, checked at bootstrap, by a minutely cron backstop (on a fresh `pb_data` the events collection isn't created until migrations run just after bootstrap), and via the dev-only `POST /api/dev-seed` route that the Vite dev server pings on `pnpm dev` startup (vite.config.ts `devSeed` plugin). Seeding must never run outside local dev.
- Guests are real auth users: `/api/guest-login` (pb_hooks/guest-auth.pb.js) mints a `guest=true` user with a synthetic `@guest.daythatworks.com` email and returns a normal auth token that the SPA stores like any login — that token IS the guest's persistent identity, so all rules/hooks apply unchanged.
- **The app never reads calendars.** Add-to-calendar (`src/lib/calendar-links.ts`, `AddToCalendarButton`) is write-only: compose links and client-generated `.ics` downloads. Never add calendar read scopes, calendar APIs, or availability autofill — it's the product's core privacy promise (see `/faq`).
- FAQ copy exists in two runtimes: `src/lib/faq.ts` (React page) and `pb_hooks/lib/seo.js` (crawler JSON-LD). `src/lib/seo.test.ts` enforces exact parity — always edit both together.
- SEO head tags live in the `og:start`/`og:end` marker block of `index.html`; `pb_hooks/og.pb.js` (events, with `noindex`) and `pb_hooks/seo.pb.js` (`/faq`) rewrite it server-side. `public/robots.txt` + `public/sitemap.xml` ship as static files.
- Guests can create events, budgeted by a sliding window in `pb_hooks/records.pb.js` + `pb_hooks/lib/rate-limit.js`; over-budget creates get a 429, non-guest users are unlimited. Limits are env-configurable (PocketHost secrets), defaulting to 5 per IP (IPv6 keyed by /64), 5 per guest user, 100 globally per 24h window: `RATE_LIMIT_PER_IP`, `RATE_LIMIT_PER_USER`, `RATE_LIMIT_GLOBAL`, `RATE_LIMIT_WINDOW_HOURS` (positive integers; invalid values fall back with a logged warning). Creations are logged to the superuser-only `guest_event_log` collection as a salted IP hash (`RATE_LIMIT_SALT` secret; falls back to a dev salt with a warning) and purged after 2x the window by the `purgeGuestEventLog` cron. `realIP()` depends on the trustedProxy settings from `pb_migrations/1700000007_proxy_and_rate_limits.js`, which also enables PocketBase's built-in per-IP burst limits on event creation and `/api/guest-login` (those two live in migration/dashboard settings, not env).
