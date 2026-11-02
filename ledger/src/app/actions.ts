"use server";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { priorities, statuses, tasks, type Priority, type Status } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { toTaskDTO, type TaskDTO } from "@/lib/task-dto";

export type { TaskDTO };

async function requireUserId() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Sign in required");
  }
  return userId;
}

export async function listTasks(filter?: {
  status?: Status | "open";
  query?: string;
}): Promise<TaskDTO[]> {
  const userId = await requireUserId();
  const clauses = [eq(tasks.userId, userId)];

  if (filter?.status === "open") {
    clauses.push(sql`${tasks.status} <> 'shipped'`);
  } else if (filter?.status) {
    clauses.push(eq(tasks.status, filter.status));
  }

  if (filter?.query?.trim()) {
    const q = `%${filter.query.trim()}%`;
    clauses.push(
      or(ilike(tasks.title, q), ilike(tasks.notes, q), sql`${tasks.labels}::text ILIKE ${q}`)!,
    );
  }

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...clauses))
    .orderBy(desc(tasks.updatedAt));

  return rows.map(toTaskDTO);
}

export async function createTask(input: {
  title: string;
  notes?: string;
  status?: Status;
  priority?: Priority;
  dueOn?: string | null;
  labels?: string[];
}): Promise<{ task?: TaskDTO; error?: string }> {
  const userId = await requireUserId();
  const title = input.title.trim();
  if (!title) {
    return { error: "A title is required." };
  }
  const status = input.status && statuses.includes(input.status) ? input.status : "inbox";
  const priority =
    input.priority && priorities.includes(input.priority) ? input.priority : "p2";
  const labels = (input.labels ?? [])
    .map((label) => label.trim().toLowerCase())
    .filter(Boolean);

  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${tasks.number}), 0)` })
    .from(tasks)
    .where(eq(tasks.userId, userId));

  const [row] = await db
    .insert(tasks)
    .values({
      userId,
      title,
      notes: input.notes?.trim() ?? "",
      status,
      priority,
      dueOn: input.dueOn || null,
      labels,
      number: (maxRow?.max ?? 0) + 1,
    })
    .returning();

  if (!row) return { error: "Could not create the task." };
  return { task: toTaskDTO(row) };
}

export async function updateTask(
  id: string,
  patch: {
    title?: string;
    notes?: string;
    status?: Status;
    priority?: Priority;
    dueOn?: string | null;
    labels?: string[];
  },
): Promise<{ task?: TaskDTO; error?: string }> {
  const userId = await requireUserId();
  const updates: Partial<typeof tasks.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) return { error: "A title is required." };
    updates.title = title;
  }
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (patch.status !== undefined) {
    if (!statuses.includes(patch.status)) return { error: "Unknown status." };
    updates.status = patch.status;
    updates.completedAt = patch.status === "shipped" ? new Date() : null;
  }
  if (patch.priority !== undefined) {
    if (!priorities.includes(patch.priority)) return { error: "Unknown priority." };
    updates.priority = patch.priority;
  }
  if (patch.dueOn !== undefined) updates.dueOn = patch.dueOn || null;
  if (patch.labels !== undefined) {
    updates.labels = patch.labels.map((label) => label.trim().toLowerCase()).filter(Boolean);
  }

  const [row] = await db
    .update(tasks)
    .set(updates)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();

  if (!row) return { error: "Task not found." };
  return { task: toTaskDTO(row) };
}

export async function deleteTask(id: string): Promise<{ ok?: true; error?: string }> {
  const userId = await requireUserId();
  const [row] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  if (!row) return { error: "Task not found." };
  return { ok: true };
}

export async function signOutAction() {
  await auth.signOut();
}
