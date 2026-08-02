# daythatworks

Find a day that works for your whole group: create an event with candidate
dates, share the permalink, and everyone marks which days they can make.
Results roll up per date with a best-day recommendation. Events live at
`/events/<slug-or-id>` (ULID ids, optional unique vanity slugs) and each
response has its own permalink at `/events/<slug-or-id>/s/<submission-id>`.
No account is needed to create events or respond — just a name. Guests get
a persistent identity kept in the browser so they can edit their events and
responses; signing in (Google/GitHub OAuth) makes that history durable
across browsers. Guest event creation is rate limited (sliding 24h window:
5 per IP, 5 per guest, plus a global daily cap) to keep spam out; signed-in
users are unlimited. Viewing needs no account. An event can hide responder
names from the group, and emails are never exposed through the public API.

Live at [https://daythatworks.com](https://daythatworks.com).

- Frontend: Vite + React + Tailwind CSS + shadcn/ui
- Backend: [PocketBase](https://pocketbase.io/) hosted on PocketHost (`https://daythatworks.pockethost.io`, served on the custom domain `daythatworks.com`)
- OAuth callback URL for provider consoles: `https://daythatworks.com/api/oauth2-redirect` (GitHub allows a single callback URL — it must be the custom domain)

## Setup

```sh
pnpm install
cp .env.example .env
```

Backend syncing/deployment uses the [phio CLI](https://pockethost.io/docs/phio) (requires Node 24+):

```sh
npm install -g phio tsx
phio login
```

For e2e tests, install the Playwright browser once:

```sh
pnpm exec playwright install chromium
```

## Development

```sh
pnpm dev
```

The dev server talks to the PocketBase URL in your `.env`. Backend files (`pb_migrations/`, `pb_hooks/`) sync to your instance with `phio dev` (watch mode).

### Local backend with fake OAuth (recommended)

Real OAuth is awkward in local development, so the app ships a dev-only fake
login. Download the [PocketBase binary](https://pocketbase.io/docs/) and run it
from the repo root (it auto-discovers `pb_hooks/` and `pb_migrations/`, and
applies migrations on startup):

```sh
DEV_AUTH=true DEV_AUTH_NAME='Dev User' DEV_AUTH_EMAIL=dev@local.test ./pocketbase serve
```

Then point the frontend at it in `.env`:

```
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_DEV_AUTH=true
```

`pnpm dev` now shows a **Dev login** button on the login page that
authenticates as the configured user (created on first use) via the
`/api/dev-login` route in `pb_hooks/dev-auth.pb.js`. The route only exists
when `DEV_AUTH=true` is set on the PocketBase process — never set it on
PocketHost. To act as a second group member, restart PocketBase with a
different `DEV_AUTH_EMAIL`/`DEV_AUTH_NAME`.

`DEV_AUTH=true` also bootstraps a local superuser (`admin@local.test` /
`localdev-admin`) so PocketBase doesn't auto-open its first-run installer
page in the browser; use those credentials for the local admin UI at
`http://127.0.0.1:8090/_/`.

With a local backend running you can also exercise the full end-to-end flow in
Playwright:

```sh
E2E_PB_URL=http://127.0.0.1:8090 VITE_POCKETBASE_URL=http://127.0.0.1:8090 \
  VITE_DEV_AUTH=true pnpm test:e2e
```

## Deployment

The production build outputs to `pb_public/`, which PocketBase serves directly:

```sh
pnpm build
phio deploy
```

Your app is deployed at [https://daythatworks.com](https://daythatworks.com) (instance URL: [https://daythatworks.pockethost.io](https://daythatworks.pockethost.io)).

## Schema & types

- Evolve the schema by adding files to `pb_migrations/` — they run automatically when the instance restarts (and locally on `pocketbase serve`).
- Regenerate TypeScript types from the live schema:

```sh
PB_TYPEGEN_URL=https://daythatworks.pockethost.io PB_TYPEGEN_EMAIL=<admin-email> PB_TYPEGEN_PASSWORD=<admin-password> pnpm typegen
```

The admin account is your pockethost.io login (PocketHost Admin Sync provisions it automatically).

## CI

`.github/workflows/ci.yml` runs `pnpm validate` on every push and pull request, and deploys to PocketHost on pushes to `main`. Add `PHIO_USERNAME` and `PHIO_PASSWORD` as repository secrets to enable the deploy job.

## Scripts

| Script                     | What it does                                         |
| -------------------------- | ---------------------------------------------------- |
| `pnpm dev`                 | Run the dev server                                   |
| `pnpm build`               | Production build into `pb_public/`                   |
| `pnpm test`                | Unit tests (vitest)                                  |
| `pnpm test:e2e`            | Playwright e2e tests                                 |
| `pnpm typegen`             | Regenerate the PocketBase record types from schema   |
| `pnpm validate:quick`      | format check + typecheck + lint + unit tests         |
| `pnpm validate`            | `validate:quick` + e2e tests                         |
| `pnpm format-and-validate` | Prettier write, then `validate` — run before commits |
