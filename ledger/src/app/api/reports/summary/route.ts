import { withAuth } from "@neon/oauth/next";
import { getReportLivePayload } from "@/lib/reports";
import { reportsAuth } from "@/lib/reports-oauth";

export const GET = withAuth(reportsAuth, async (_request, auth) => {
  const payload = await getReportLivePayload(auth.sub);
  return Response.json(payload);
});
