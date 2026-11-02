export type TaskSummaryRow = {
  number: number;
  title: string;
  notes: string;
  status: string;
  priority: string;
  dueOn: string | null;
  labels: string[];
  createdAt: string;
  completedAt: string | null;
};

export type ReportSummary = {
  user: { id: string; name: string; email: string };
  generatedAt: string;
  totals: {
    all: number;
    open: number;
    overdue: number;
    inbox: number;
    doing: number;
    blocked: number;
    shipped: number;
  };
  priorities: { p0: number; p1: number; p2: number };
  labels: { label: string; count: number }[];
  oldestOpen: {
    number: number;
    title: string;
    status: string;
    createdAt: string;
  } | null;
  recentlyShipped: {
    number: number;
    title: string;
    completedAt: string;
  }[];
  blocked: { number: number; title: string; notes: string }[];
};

export function summaryFromTasks(
  rows: TaskSummaryRow[],
  opts: { user: ReportSummary["user"]; now: Date },
): ReportSummary {
  const today = opts.now.toISOString().slice(0, 10);
  const weekAgo = opts.now.getTime() - 7 * 86400000;

  const totals = {
    all: rows.length,
    open: 0,
    overdue: 0,
    inbox: 0,
    doing: 0,
    blocked: 0,
    shipped: 0,
  };
  const priorities = { p0: 0, p1: 0, p2: 0 };
  const labelCounts = new Map<string, number>();
  let oldestOpen: ReportSummary["oldestOpen"] = null;
  const recentlyShipped: ReportSummary["recentlyShipped"] = [];
  const blocked: ReportSummary["blocked"] = [];

  for (const row of rows) {
    if (row.status in totals) {
      totals[row.status as "inbox" | "doing" | "blocked" | "shipped"] += 1;
    }
    if (row.priority in priorities) {
      priorities[row.priority as "p0" | "p1" | "p2"] += 1;
    }
    for (const label of row.labels ?? []) {
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }

    if (row.status !== "shipped") {
      totals.open += 1;
      if (row.dueOn && row.dueOn < today) totals.overdue += 1;
      if (
        !oldestOpen ||
        new Date(row.createdAt).getTime() < new Date(oldestOpen.createdAt).getTime()
      ) {
        oldestOpen = {
          number: row.number,
          title: row.title,
          status: row.status,
          createdAt: row.createdAt,
        };
      }
    }

    if (row.status === "blocked") {
      blocked.push({
        number: row.number,
        title: row.title,
        notes: row.notes,
      });
    }

    if (
      row.status === "shipped" &&
      row.completedAt &&
      new Date(row.completedAt).getTime() >= weekAgo
    ) {
      recentlyShipped.push({
        number: row.number,
        title: row.title,
        completedAt: row.completedAt,
      });
    }
  }

  recentlyShipped.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  blocked.sort((a, b) => a.number - b.number);

  return {
    user: opts.user,
    generatedAt: opts.now.toISOString(),
    totals,
    priorities,
    labels: [...labelCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    oldestOpen,
    recentlyShipped: recentlyShipped.slice(0, 8),
    blocked,
  };
}
