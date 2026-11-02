# Ledger

A **demo** of three apps on one [Neon](https://neon.com) project: Postgres, Managed Better Auth (OAuth 2.1 Provider), and Neon Functions.

| App | Folder | Live demo |
|---|---|---|
| Task list + hosted login/consent | [`ledger/`](./ledger) | https://ledger-mocha-nine.vercel.app |
| Reporting dashboard (OAuth client) | [`rollup/`](./rollup) | https://ledger-rollup.vercel.app |
| MCP server (Neon Function) | [`mcp/`](./mcp) | [MCP URL](https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp) |

This is a public sample, not a product. Copy the pattern; use your own Neon project, Auth instance, and secrets.

## What it shows

- **Ledger** — Next.js task UI. Users sign in with email/password, Google, or Apple via `@neon/auth`. The same `/auth/sign-in` and `/auth/consent` pages are the OAuth Provider `login_page` and `consent_page` (not a second login app).
- **Rollup** — a **different origin**. It does not share Ledger cookies. It is a confidential OAuth client of the **same** Auth instance, then calls Ledger’s `/api/reports/summary` with a bearer token (`aud` = reports resource).
- **MCP** — Streamable HTTP on Neon Functions. Agents (Cursor, Claude, …) sign in through the same OAuth Provider and call `whoami`, `list_tasks`, `create_task`, `update_task`, `complete_task`.

```
OAuth client (Rollup or MCP)
  → Neon Auth /oauth2/authorize   (*.neonauth.*)
  → Ledger /auth/sign-in          (app session cookies)
  → Ledger /auth/consent
  → back to Neon Auth → client
```

`/oauth2/authorize` cannot see Ledger cookies, so it always sends the browser to Ledger login with a signed query. If the user is already signed in, Ledger resumes with `oauth2.continue`. Email sign-in on that page forwards the signed query automatically.

## One Neon project

| | |
|---|---|
| Project | `raspy-sky-68137690` (`aws-us-east-2`) |
| Auth | `https://ep-royal-star-b5uabv5e.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth` |
| MCP | `https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp` |

Point Auth **login_page** / **consent_page** at the Ledger URLs you are actually using (local or Vercel).

## Run locally

Port **4567** for Ledger (3000 is often a Neon console tunnel). Rollup is **4570**.

```bash
cp ledger/.env.example ledger/.env.local   # DATABASE_URL, NEON_AUTH_*, …
cp rollup/.env.example rollup/.env.local   # OAUTH_CLIENT_ID / SECRET, …
npm --prefix ledger install
npm --prefix rollup install
PORT=4567 npm run ledger:dev
npm run rollup:dev
```

Details: [ledger/README.md](./ledger/README.md), [rollup/README.md](./rollup/README.md), [mcp/README.md](./mcp/README.md).

## Cursor MCP

```json
{
  "mcpServers": {
    "Ledger": {
      "url": "https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp"
    }
  }
}
```

Try: “Who am I?”, “List my open tasks”, “Create a p1 task titled …”.

## Known demo limits

- **Google during an OAuth visit** (Rollup/MCP authorize → Ledger → Google) currently returns to Ledger `/` with a session and does **not** finish the client’s authorize. Email/password on the hosted login page does. Signing into Ledger with Google when you opened Ledger directly works.
- Do not commit `.env.local`. Cookie secrets and the Rollup client secret stay in Vercel / your machine.
