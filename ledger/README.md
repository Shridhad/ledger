# Ledger

Next.js task list: Neon Postgres, Drizzle, Managed Better Auth (`@neon/auth`).

This app is also the OAuth Provider **host**: `/auth/sign-in` is `login_page`, `/auth/consent` is `consent_page` for Rollup and MCP. There is no second login UI.

Live: https://ledger-mocha-nine.vercel.app  
Workspace: [root README](../README.md)

## What you can do

- Sign in with email/password, Google, or Apple.
- Capture tasks (`inbox` / `doing` / `blocked` / `shipped`, `p0`–`p2`).
- Authorize other clients (consent screen).
- Expose `GET /api/reports/summary` as an OAuth resource (`@neon/oauth` `withAuth`). JWT `aud` must be `LEDGER_REPORTS_RESOURCE`.

## Stack

- Next.js 16 App Router (`src/proxy.ts`, not `middleware.ts`)
- `@neon/auth` — session cookies, `/api/auth/[...path]` proxy
- `@neon/oauth` — reports API as resource server
- Drizzle + Neon HTTP driver

Auth middleware **protects the app** (`/`) and **skips** `/auth/*` and `/api/reports`. Login is not a protected route. If the URL has a signed OAuth query (`sig`, `ba_param`) and the user already has a session, the login page calls `authClient.oauth2.continue({ selected: true })`. Consent uses `oauth2.publicClient` and `oauth2.consent({ accept })`.

## Local

```bash
cp .env.example .env.local
# DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET (32+ chars)
npm install
PORT=4567 npm run dev
```

Open [http://localhost:4567](http://localhost:4567).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres |
| `NEON_AUTH_BASE_URL` | Managed Auth issuer |
| `NEON_AUTH_COOKIE_SECRET` | Sign session cookies |
| `NEXT_PUBLIC_APP_URL` | App origin |
| `NEXT_PUBLIC_ROLLUP_URL` | Optional “Rollup” link in the header |
| `LEDGER_REPORTS_RESOURCE` | JWT `aud` for `/api/reports` |
| `MCP_RESOURCE` | Documented for the function; Ledger UI does not call MCP |

Cookie secret:

```bash
openssl rand -base64 32
```

In the Neon Console, set OAuth Provider **login_page** / **consent_page** to this origin (`http://localhost:4567/auth/sign-in` locally, or the Vercel URLs in production). `/oauth2/authorize` lives on the neonauth host, so it will not see localhost cookies unless you complete login on this app.

## Deploy

Vercel project root is `ledger/`. `installCommand` uses `--legacy-peer-deps`. `.vercelignore` drops `.npmrc` and `package-lock.json` so CI does not use private registry URLs.

Required Vercel env: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `LEDGER_REPORTS_RESOURCE` (production reports URL), `NEXT_PUBLIC_ROLLUP_URL`.

## Related

- [Rollup](../rollup/README.md) — confidential client of this Auth instance
- [MCP](../mcp/README.md) — same users and tasks over MCP
