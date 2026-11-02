export type { ReportSummary } from "./report-summary";

export type TaskDTO = {
  id: string;
  number: number;
  title: string;
  notes: string;
  status: string;
  priority: string;
  dueOn: string | null;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type TaskLiveRow = {
  id: string;
  number: number;
  title: string;
  notes: string;
  status: string;
  priority: string;
  dueOn: string | null;
  labels: string[] | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt: Date | string | null;
};

export type ReportsLivePayload = {
  user: { id: string; name: string; email: string };
  tasks: TaskDTO[];
  sealedQuery: unknown | null;
  realtimeUrl: string | null;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

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
