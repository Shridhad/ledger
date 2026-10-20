# Ledger

A personal work ledger for software developers and project managers. Tasks live in Neon Postgres, users sign in with Managed Better Auth (email + password or Google), and agents talk to the same data through an MCP server hosted on Neon Functions.

## What you get

- Capture, inspect, and ship tasks with statuses (`inbox`, `doing`, `blocked`, `shipped`) and priorities (`p0`–`p2`).
- Email/password and Google sign-in via Managed Better Auth.
- Hosted login + consent pages so MCP clients can run the OAuth 2.1 flow against the OAuth Provider plugin.
- MCP tools: `whoami`, `list_tasks`, `create_task`, `update_task`, `complete_task`.

## Project

- Neon project: `raspy-sky-68137690` (org Shridhar, `aws-us-east-2`)
- Auth URL: `https://ep-royal-star-b5uabv5e.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth`
- MCP: `https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp`

## Local app

```bash
cp .env.example .env.local
# fill DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET
npm install
PORT=4567 npm run dev
```

Open [http://localhost:4567](http://localhost:4567). Port 4567 avoids the local Neon console tunnel on 3000. Google uses Neon's shared OAuth credentials in development.

## MCP + OAuth Provider

The function is already deployed. Cursor can add it as a streamable HTTP server:

```json
{
  "mcpServers": {
    "ledger": {
      "url": "https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp"
    }
  }
}
```

Login and consent currently point at `http://localhost:4567/auth/sign-in` and `/auth/consent`. After you host the Next.js app, PATCH those URLs:

```bash
neon api /projects/raspy-sky-68137690/branches/br-steep-sun-b5lukx3v/auth/plugins/oauth-provider \
  -X PATCH \
  -F login_page=https://your-app.example/auth/sign-in \
  -F consent_page=https://your-app.example/auth/consent \
  -F mcp.resource=https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp
```

Redeploy the function after changing its env:

```bash
npm run mcp:deploy -- --env MCP_RESOURCE=https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp
```
