import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks, userInNeonAuth } from "@/db/schema";
import { toTaskDTO, type TaskDTO } from "@/lib/task-dto";
import { getRealtime, getRealtimeUrl } from "@/lib/realtime";

export function tasksQuery(userId: string) {
  return db
    .select({
      id: tasks.id,
      number: tasks.number,
      title: tasks.title,
      notes: tasks.notes,
      status: tasks.status,
      priority: tasks.priority,
      dueOn: tasks.dueOn,
      labels: tasks.labels,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.updatedAt));
}

export async function sealTasksQuery(userId: string) {
  const realtime = getRealtime();
  if (!realtime) return null;
  return realtime.seal({ query: tasksQuery(userId) });
}

export async function loadTasks(userId: string): Promise<{
  tasks: TaskDTO[];
  sealedQuery: Awaited<ReturnType<typeof sealTasksQuery>>;
  realtimeUrl: string | null;
}> {
  const [rows, sealedQuery] = await Promise.all([
    tasksQuery(userId),
    sealTasksQuery(userId),
  ]);
  return {
    tasks: rows.map(toTaskDTO),
    sealedQuery,
    realtimeUrl: sealedQuery ? getRealtimeUrl() : null,
  };
}

export async function loadReportUser(userId: string) {
  const [user] = await db
    .select({
      id: userInNeonAuth.id,
      name: userInNeonAuth.name,
      email: userInNeonAuth.email,
    })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId))
    .limit(1);

  return {
    id: user?.id ?? userId,
    name: user?.name ?? "Operator",
    email: user?.email ?? "",
  };
}
