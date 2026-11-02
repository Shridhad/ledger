import { loadReportUser, loadTasks } from "@/lib/tasks-live";

export async function getReportLivePayload(userId: string) {
  const [user, live] = await Promise.all([loadReportUser(userId), loadTasks(userId)]);
  return {
    user,
    tasks: live.tasks,
    sealedQuery: live.sealedQuery,
    realtimeUrl: live.realtimeUrl,
  };
}
