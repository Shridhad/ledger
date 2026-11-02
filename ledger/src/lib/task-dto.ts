import type { Priority, Status } from "@/db/schema";

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

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export type TaskLiveRow = {
  id: string;
  number: number;
  title: string;
  notes: string;
  status: Status;
  priority: Priority;
  dueOn: string | null;
  labels: string[] | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt: Date | string | null;
};

export function toTaskDTO(row: TaskLiveRow): TaskDTO {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    dueOn: row.dueOn,
    labels: row.labels ?? [],
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
    completedAt: toIso(row.completedAt),
  };
}

export function sortTasks(tasks: TaskDTO[]): TaskDTO[] {
  return [...tasks].sort((a, b) => {
    const byUpdated = b.updatedAt.localeCompare(a.updatedAt);
    if (byUpdated) return byUpdated;
    return b.number - a.number;
  });
}
