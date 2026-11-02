import { withAuth } from "@neon/oauth/next";
import { reportsAuth } from "@/lib/reports-oauth";
import { sealTasksQuery } from "@/lib/tasks-live";

const noStore = { "Cache-Control": "private, no-store" };

export const POST = withAuth(reportsAuth, async (_request, auth) => {
  const sealedQuery = await sealTasksQuery(auth.sub);
  if (!sealedQuery) {
    return Response.json({ error: "REALTIME_UNAVAILABLE" }, { status: 503, headers: noStore });
  }
  return Response.json(sealedQuery, { headers: noStore });
});
