import { auth } from "@/lib/auth/server";
import { sealTasksQuery } from "@/lib/tasks-live";

const noStore = { "Cache-Control": "private, no-store" };

export async function POST() {
  const { data } = await auth.getSession();
  const userId = data?.user?.id;
  if (!userId) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: noStore });
  }
  const sealedQuery = await sealTasksQuery(userId);
  if (!sealedQuery) {
    return Response.json({ error: "REALTIME_UNAVAILABLE" }, { status: 503, headers: noStore });
  }
  return Response.json(sealedQuery, { headers: noStore });
}
