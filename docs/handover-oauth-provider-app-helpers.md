# Handover: OAuth Provider login/consent helpers in `@neondatabase/auth`

**Audience:** Neon Auth / `@neondatabase/auth` maintainers  
**Status:** Proposal from building a first-party OAuth client (Rollup) against Managed Better Auth  
**Goal:** Decide whether the SDK should expose Better Auth’s OAuth Provider app-side APIs so hosted login/consent is a few lines, not a protocol integration.

---

## Why this came up

Managed Better Auth with the OAuth Provider plugin requires **hosted** `login_page` and `consent_page`. There are no default screens.

Ledger (`ledger/`) reused its existing `/auth/sign-in` as `login_page` and added `/auth/consent`. Rollup is a **separate app** and confidential OAuth client of the **same** Auth instance. It does not share Ledger cookies.

That integration works, but almost all of the non-UI work is glue that every OAuth-provider app will rewrite:

1. Preserve the signed query string (`oauth_query`) exactly.
2. Forward it on `signIn` / `signUp`.
3. If the user is **already signed in**, continue to consent instead of showing the login form.
4. On consent: load public client metadata, POST `/oauth2/consent` with `{ accept, oauth_query }`, follow the returned `url`.

Better Auth already has most of these APIs. `@neondatabase/auth` does not expose them today (`createAuthClient()` has no `oauthProviderClient()`). Apps also cannot call `verifyOAuthQueryParams(query, secret)` because they do not have `auth.$context.secret`.

---

## Architecture that apps get wrong

```
OAuth client (e.g. Rollup)
  → Neon Auth /oauth2/authorize   (*.neonauth.*)
  → App login_page                (app origin, e.g. Ledger)
  → App consent_page              (app origin)
  → back to Neon Auth → client redirect
```

`/oauth2/authorize` runs on the Neon Auth host. It **cannot** see the app’s session cookies. So it **always** redirects to `login_page` with a signed query, even when the user is already signed into the app in another tab.

Better Auth’s docs say: *“You don't need to handle anything from your side; when a **new** session is created, the plugin will handle continuing the authorization flow.”*

That is true for a fresh sign-in. It is **not** true for an existing app session on a hosted login page. The login page must notice the session and resume with the signed query.

Do not describe this as a second login page. It is the **same** `/auth/sign-in`, with a signed OAuth query present.

---

## What Better Auth already ships

Source: [OAuth 2.1 Provider](https://www.better-auth.com/docs/plugins/oauth-provider)

| API | Role |
|---|---|
| `oauthProviderClient()` | Auto-attaches signed `oauth_query` to client calls that need it |
| Session-create continuation | After **new** login/signup, plugin resumes authorize |
| `verifyOAuthQueryParams(query, secret)` | Rejects tampered/expired query. Does **not** check session, client, or scopes |
| `authClient.oauth2.consent({ accept, scope?, claims? })` | Completes or denies consent |
| `auth.api.oauth2Consent` | Same, server-side |
| `authClient.oauth2.continue({ selected, created, postLogin })` | Resume after account / signup / org steps |
| `authClient.oauth2.publicClientPrelogin` | Public client metadata before login (`allowPublicClientPrelogin`) |

Consent is explicitly app-owned: verify query → render client/scopes → call `oauth2.consent`.

**Not shipped:** React hooks, UI, or a “session already exists on `loginPage`” resume helper.

---

## What `@neondatabase/auth` should expose

Apps using Managed Auth should not depend on `@better-auth/oauth-provider` or a signing secret. The SDK already wraps Better Auth for sign-in; OAuth Provider hosted pages should be the same.

### 1. Client plugin (low effort, high leverage)

Enable `oauthProviderClient()` (or equivalent) on `createAuthClient()` / `createNeonAuth()` when the project has OAuth Provider enabled.

Then existing login stays:

```ts
await authClient.signIn.email({ email, password });
```

and the signed query is forwarded automatically. Custom auth endpoints still pass `oauth_query` by hand.

### 2. Resume existing session (Neon-specific; the real gap)

```ts
// Server (login_page)
const result = await auth.oauth.resume({
  query: request.url, // or raw search string
});
if (result.redirectTo) redirect(result.redirectTo);
```

`resume` should:

- Detect a signed OAuth query vs a normal login visit.
- Validate the query **without** the app holding the cookie secret (call Neon Auth, or a dedicated endpoint).
- If no session → render login (status: `"login"`).
- If session → return next URL (`consent_page` or back to authorize/client, including `skip_consent` / existing consent).
- Honor `prompt=login`, `prompt=consent`, `select_account` if those are enabled.

Apps should not hand-build `/auth/consent?${oauthQuery}`. That skips provider decisions.

### 3. Consent helpers (thin wrap of existing endpoints)

```ts
const request = await auth.oauth.getConsentRequest();
// { client, scopes, resource, queryValid }

await authClient.oauth2.consent({ accept: true });
// follows data.url
```

`getConsentRequest` wraps public-client fetch + query validation. `consent` already exists in Better Auth; expose it on the Neon client with types and redirect handling.

### 4. Optional React/Next adapter (later)

```ts
const flow = useOAuthProviderFlow();
// kind: "none" | "login" | "consent"
// continueFlow / approve / deny
```

Not required for v1. Headless primitives first.

---

## Suggested phasing

**P0 — make the documented Better Auth client path work on Neon**

- Ship `oauthProviderClient` (auto `oauth_query`).
- Typed `oauth2.consent` / `oauth2.continue`.
- Document: same login page; forward query; consent is the extra screen.
- Document: authorize host ≠ app host, so login must check session.

**P1 — resume API**

- `auth.oauth.resume()` (server) so apps do not reconstruct consent URLs.
- Query verification that does not require `auth.$context.secret`.

**P2 — consent request DTO + Next helper**

- `getConsentRequest()` for display data.
- Optional `useOAuthProviderFlow()`.

---

## What we implemented without helpers (evidence)

Ledger login (after the bug):

```ts
const { data: session } = await auth.getSession();
return <SignInForm signedIn={Boolean(session?.user)} />;
```

If `signedIn` and the URL has an OAuth query, the form does `location.replace(/auth/consent?${oauthQuery})`.

Consent posts by hand:

```ts
await fetch("/api/auth/oauth2/consent", {
  method: "POST",
  body: JSON.stringify({ accept, oauth_query: oauthQuery }),
});
```

Sign-in still passes `oauth_query` on `signIn.email` / `signIn.social` because the Neon client plugin is not mounted.

This is ~40–80 lines of protocol glue, easy to get wrong (query signature, Secure cookies, skipping `getSession` on `/auth/*` because middleware excludes it).

---

## Non-goals

- A second login UI or a separate “OAuth login page.”
- Replacing Better Auth’s authorize/consent protocol.
- Bundling default HTML for login/consent in the SDK (hosting requirement stays).
- Changing MCP CIMD/DCR. This is for **managed OAuth clients** (and any app that is `login_page`).

---

## Open questions for the team

1. **Can `oauthProviderClient` be on by default** when OAuth Provider is enabled, or must apps opt in?
2. **Where does query verification live on Managed Auth?** Apps cannot use `verifyOAuthQueryParams` + secret. New Neon Auth endpoint vs SDK calling an existing one?
3. **Should `resume` be a server round-trip to `/oauth2/authorize` with cookies**, or a first-party “continue if session” endpoint? The former reuses Better Auth’s prompt/consent logic; the latter is custom.
4. **`skip_consent` for first-party clients:** still need login-page query forwarding; consent UI can be skipped. Should docs lead with that for Neon-to-Neon apps?
5. **Middleware:** Next 16 `proxy.ts` typically skips `/auth/*`. Resume cannot rely on auth middleware. The helper should be called from the login page/loader.
6. **Secret vs cookie cache:** `getSession` on the login page is enough to know the user is signed in; resume still needs the signed query intact (duplicate `ba_param` keys, `sig`). Do not rebuild the query from a parsed object.

---

## Recommendation

Treat this as an SDK gap, not an app bug.

- **Must expose:** client plugin + `oauth2.consent` (Better Auth already designed this).
- **Should expose:** `resume()` for existing sessions on hosted `login_page` (Managed Auth split-origin makes this the common case).
- **Nice to have:** `getConsentRequest()` / React helper.

Until that ships, every OAuth Provider app copies the same glue, and the “already logged in, still see login” failure is the default.
