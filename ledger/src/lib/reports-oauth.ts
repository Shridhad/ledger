import { createOAuth } from "@neon/oauth";

export const reportsAuth = createOAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  resource: process.env.LEDGER_REPORTS_RESOURCE!,
});
