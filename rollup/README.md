# Rollup

Reporting dashboard. **Separate app** from Ledger: different origin, different cookies, confidential OAuth client of the **same** Neon Managed Auth instance.

Live: https://ledger-rollup.vercel.app  
Workspace: [root README](../README.md)

## Flow

1. User opens Rollup and hits `/api/auth/login` (`@neon/oauth` `createOAuth` + `createRouteHandlers`).
2. Neon Auth `/oauth2/authorize` (PKCE + `resource` = Ledger reports URL).
3. Browser goes to **Ledger** login/consent (not a Rollup login page).
4. Token `aud` is `LEDGER_REPORTS_RESOURCE`.
5. Rollup’s server calls Ledger `GET /api/reports/summary` with that bearer token. If Realtime is enabled, the payload includes a sealed per-user tasks query and the dashboard stays live.

Rollup never reads Ledger’s session cookie.

## Local

Ledger should already be on [http://localhost:4567](http://localhost:4567).

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:4570](http://localhost:4570).

| Variable | Purpose |
|---|---|
| `NEON_AUTH_BASE_URL` | Same issuer as Ledger |
| `NEON_AUTH_COOKIE_SECRET` | Rollup’s own session cookie (`rollup_session`) |
| `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` | Confidential client from Neon Console |
| `OAUTH_REDIRECT_URI` | `http://localhost:4570/api/auth/callback` locally |
| `LEDGER_REPORTS_RESOURCE` | Must match Ledger’s reports `aud` |
| `LEDGER_REPORTS_URL` | Where to GET the summary |
| `NEXT_PUBLIC_LEDGER_URL` | Link back to the task app |

Register the client on the Auth instance: confidential, redirect URI above, resource = reports URL. After you host Rollup, add the production callback (`https://ledger-rollup.vercel.app/api/auth/callback`) as well.

If Auth **login_page** still points at production Ledger, a local Rollup authorize will send you to **production** login, not `localhost:4567`. Point login/consent at local Ledger when you are testing this machine.

## Deploy

Vercel root is `rollup/`. Same install command as Ledger. Set production redirect, reports URL, and client secret in the project env — never commit the secret.

## Related

- [Ledger](../ledger/README.md) — login, consent, reports API
- [MCP](../mcp/README.md) — another OAuth client of the same issuer
