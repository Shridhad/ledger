# Ledger workspace

Three apps, one Neon project:

| Folder | What it is |
|---|---|
| `ledger/` | Task list UI + hosted OAuth login/consent |
| `rollup/` | Reporting dashboard (confidential OAuth client) |
| `mcp/` | MCP server on Neon Functions |

Tasks live in Neon Postgres. Users sign in with Managed Better Auth (email + password or Google).

## Project

- Neon project: `raspy-sky-68137690` (org Shridhar, `aws-us-east-2`)
- Auth URL: `https://ep-royal-star-b5uabv5e.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth`
- MCP: `https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp`
- Ledger (prod): https://ledger-mocha-nine.vercel.app
- Rollup (prod): https://ledger-rollup.vercel.app

## Local apps

Port 4567 avoids the local Neon console tunnel on 3000.

```bash
cp ledger/.env.example ledger/.env.local
# fill DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET
npm --prefix ledger install
PORT=4567 npm run ledger:dev
```

```bash
cp rollup/.env.example rollup/.env.local
# fill OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET
npm --prefix rollup install
npm run rollup:dev
```

Open Ledger at [http://localhost:4567](http://localhost:4567) and Rollup at [http://localhost:4570](http://localhost:4570).

## MCP + OAuth Provider

```json
{
  "mcpServers": {
    "ledger": {
      "url": "https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp"
    }
  }
}
```

Hosted login and consent are Ledger’s `/auth/sign-in` and `/auth/consent`. Redeploy the function after changing its env:

```bash
npm run mcp:deploy -- --env MCP_RESOURCE=https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp
```

## Rollup OAuth

Rollup does not share Ledger cookies. It is a confidential OAuth client of the same Auth instance:

1. Browser hits Rollup → `/api/auth/login`
2. Neon Auth sends the user to Ledger’s hosted login + consent
3. Token `aud` is Ledger’s reports API
4. Rollup’s server calls Ledger `/api/reports/summary` with that bearer token
