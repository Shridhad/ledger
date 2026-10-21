"use server";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { priorities, statuses, tasks, type Priority, type Status } from "@/db/schema";
import { auth } from "@/lib/auth/server";

async function requireUserId() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Sign in required");
  }
  return userId;
}

export type TaskDTO = {
  id: string;
  number: number;
  title: string;
  notes: string;
  status: Status;
  priority: Priority;
  dueOn: string | null;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

function toDTO(row: typeof tasks.$inferSelect): TaskDTO {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    dueOn: row.dueOn,
    labels: row.labels ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
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

  return rows.map(toDTO);
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

  revalidatePath("/");
  return { task: toDTO(row) };
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
  revalidatePath("/");
  return { task: toDTO(row) };
}

export async function deleteTask(id: string): Promise<{ ok?: true; error?: string }> {
  const userId = await requireUserId();
  const [row] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  if (!row) return { error: "Task not found." };
  revalidatePath("/");
  return { ok: true };
}

export async function signOutAction() {
  await auth.signOut();
}
