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
