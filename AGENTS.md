<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-upgrade -->

## Next.js upgrade reminders

Upgrade reminders emitted by this project's installed Next.js CLI during `next dev` or `next build` are part of the `experimental.agentUpgrade` workflow. Follow these reminders' instructions while respecting user instructions declining upgrades.

<!-- END:nextjs-agent-upgrade -->

## Learned User Preferences

- Do not describe Ledger as having a second OAuth login page. The same `/auth/sign-in` is the OAuth Provider `login_page`; it only differs when the signed OAuth query is present.
- During an OAuth redirect, `/auth/sign-in` should check for an existing session on load and continue to consent instead of asking the user to log in again.

## Learned Workspace Facts

- This repo is three sibling apps: `ledger/` (task UI + hosted OAuth login/consent), `rollup/` (reporting dashboard, confidential OAuth client of the same Neon Managed Better Auth instance; does not share Ledger cookies), and `mcp/` (Neon Function). The MCP entrypoint is `mcp/index.ts` (moved from `functions/mcp`).
- Next.js 16 uses `src/proxy.ts`, not `middleware.ts`. Auth middleware skips `/auth/*`, so hosted login and consent cannot rely on that matcher for session redirects.
- OAuth Provider hosted login and consent reuse Ledger's existing login. Preserve and forward the signed `oauth_query`; consent is the only extra flow. `/oauth2/authorize` runs on the neonauth host and cannot see localhost app cookies.
- Local convention: Ledger on port 4567 (port 3000 is often taken by a Neon console tunnel); Rollup on 4570.
