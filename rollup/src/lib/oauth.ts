import { createOAuth } from "@neon/oauth";

export const oauth = createOAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  resource: process.env.LEDGER_REPORTS_RESOURCE!,
  clientId: process.env.OAUTH_CLIENT_ID!,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  redirectUri: process.env.OAUTH_REDIRECT_URI!,
  scopes: ["profile", "email"],
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    name: "rollup_session",
  },
});
