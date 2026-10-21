import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks, userInNeonAuth, type Priority, type Status } from "@/db/schema";

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
  priorities: Record<Priority, number>;
  labels: { label: string; count: number }[];
  oldestOpen: {
    number: number;
    title: string;
    status: Status;
    createdAt: string;
  } | null;
  recentlyShipped: {
    number: number;
    title: string;
    completedAt: string;
  }[];
  blocked: { number: number; title: string; notes: string }[];
};

function emptyPriorities(): Record<Priority, number> {
  return { p0: 0, p1: 0, p2: 0 };
}

export async function getReportSummary(userId: string): Promise<ReportSummary> {
  const [user] = await db
    .select({
      id: userInNeonAuth.id,
      name: userInNeonAuth.name,
      email: userInNeonAuth.email,
    })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId))
    .limit(1);

  const rows = await db.select().from(tasks).where(eq(tasks.userId, userId));
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = Date.now() - 7 * 86400000;

  const totals = {
    all: rows.length,
    open: 0,
    overdue: 0,
    inbox: 0,
    doing: 0,
    blocked: 0,
    shipped: 0,
  };
  const priorities = emptyPriorities();
  const labelCounts = new Map<string, number>();
  let oldestOpen: ReportSummary["oldestOpen"] = null;
  const recentlyShipped: ReportSummary["recentlyShipped"] = [];
  const blocked: ReportSummary["blocked"] = [];

  for (const row of rows) {
    totals[row.status] += 1;
    priorities[row.priority] += 1;
    for (const label of row.labels ?? []) {
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }

    if (row.status !== "shipped") {
      totals.open += 1;
      if (row.dueOn && row.dueOn < today) totals.overdue += 1;
      if (
        !oldestOpen ||
        row.createdAt.getTime() < new Date(oldestOpen.createdAt).getTime()
      ) {
        oldestOpen = {
          number: row.number,
          title: row.title,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
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
      row.completedAt.getTime() >= weekAgo
    ) {
      recentlyShipped.push({
        number: row.number,
        title: row.title,
        completedAt: row.completedAt.toISOString(),
      });
    }
  }

  recentlyShipped.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  blocked.sort((a, b) => a.number - b.number);

  return {
    user: {
      id: user?.id ?? userId,
      name: user?.name ?? "Operator",
      email: user?.email ?? "",
    },
    generatedAt: new Date().toISOString(),
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
