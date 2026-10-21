import { withAuth } from "@neon/oauth/next";
import { getReportSummary } from "@/lib/reports";
import { reportsAuth } from "@/lib/reports-oauth";

export const GET = withAuth(reportsAuth, async (_request, auth) => {
  const summary = await getReportSummary(auth.sub);
  return Response.json(summary);
});
