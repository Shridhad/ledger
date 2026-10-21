"use client";

import { useEffect, useState } from "react";
import type { ReportSummary } from "@/lib/types";

const LEDGER_URL = process.env.NEXT_PUBLIC_LEDGER_URL ?? "http://localhost:4567";

function Bar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className: string;
}) {
  const width = max === 0 ? 0 : Math.max(4, Math.round((value / max) * 100));
  return (
    <div className="h-2 w-full bg-rule/50">
      <div className={`h-2 ${className}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function Dashboard() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/summary")
      .then(async (response) => {
        if (response.status === 401) {
          if (!cancelled) setSummary(null);
          return;
        }
        if (!response.ok) {
          throw new Error(`Reports API returned ${response.status}`);
        }
        const payload = (await response.json()) as ReportSummary;
        if (!cancelled) setSummary(payload);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6">
        <p className="font-mono text-sm text-muted">Pulling the rollup…</p>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <p className="font-mono text-[11px] tracking-[0.28em] text-muted uppercase">
          Ledger reports
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-tight">
          Rollup
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          This is a separate app. It signs in through Ledger’s Managed Better
          Auth OAuth Provider and then calls Ledger’s reports API with a JWT
          whose audience is that API — not Ledger’s cookie session.
        </p>
        {error ? <p className="mt-4 text-sm text-stamp">{error}</p> : null}
        <a
          href="/api/auth/login"
          className="mt-8 inline-flex w-fit bg-ink px-5 py-2.5 text-sm tracking-wide text-paper-2 uppercase"
        >
          Sign in with Ledger
        </a>
      </main>
    );
  }

  const statusMax = Math.max(
    summary.totals.inbox,
    summary.totals.doing,
    summary.totals.blocked,
    summary.totals.shipped,
    1,
  );
  const priorityMax = Math.max(
    summary.priorities.p0,
    summary.priorities.p1,
    summary.priorities.p2,
    1,
  );
  const labelMax = Math.max(...summary.labels.map((item) => item.count), 1);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-muted uppercase">
            Weekly rollup
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
            Rollup
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <a
            href={LEDGER_URL}
            className="border border-rule px-3 py-1.5 text-xs tracking-wide uppercase hover:border-ink"
          >
            Ledger
          </a>
          <div className="text-right">
            <div className="text-ink">{summary.user.name}</div>
            <div className="font-mono text-xs">{summary.user.email}</div>
          </div>
          <a
            href="/api/auth/logout"
            className="border border-rule px-3 py-1.5 text-xs tracking-wide uppercase hover:border-ink"
          >
            Sign out
          </a>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Open" value={summary.totals.open} />
        <Stat label="Overdue" value={summary.totals.overdue} hot />
        <Stat label="Blocked" value={summary.totals.blocked} />
        <Stat label="Shipped" value={summary.totals.shipped} />
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
            Status mix
          </h2>
          <div className="mt-4 space-y-3">
            {(
              [
                ["inbox", summary.totals.inbox, "bg-slate"],
                ["doing", summary.totals.doing, "bg-stamp"],
                ["blocked", summary.totals.blocked, "bg-ochre"],
                ["shipped", summary.totals.shipped, "bg-moss"],
              ] as const
            ).map(([label, value, bar]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between font-mono text-xs">
                  <span className="uppercase">{label}</span>
                  <span>{value}</span>
                </div>
                <Bar value={value} max={statusMax} className={bar} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
            Priority mix
          </h2>
          <div className="mt-4 space-y-3">
            {(
              [
                ["p0", summary.priorities.p0, "bg-stamp"],
                ["p1", summary.priorities.p1, "bg-ochre"],
                ["p2", summary.priorities.p2, "bg-slate"],
              ] as const
            ).map(([label, value, bar]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between font-mono text-xs">
                  <span className="uppercase">{label}</span>
                  <span>{value}</span>
                </div>
                <Bar value={value} max={priorityMax} className={bar} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
            Oldest open
          </h2>
          {summary.oldestOpen ? (
            <p className="mt-3 text-sm">
              <span className="font-mono text-muted">
                LED-{summary.oldestOpen.number}
              </span>{" "}
              {summary.oldestOpen.title}
              <span className="mt-1 block font-mono text-xs text-muted">
                {summary.oldestOpen.status} · filed{" "}
                {summary.oldestOpen.createdAt.slice(0, 10)}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">Nothing open.</p>
          )}

          <h2 className="mt-8 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
            Blocked
          </h2>
          {summary.blocked.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Clear.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {summary.blocked.map((item) => (
                <li key={item.number}>
                  <span className="font-mono text-muted">LED-{item.number}</span>{" "}
                  {item.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
            Shipped this week
          </h2>
          {summary.recentlyShipped.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {summary.recentlyShipped.map((item) => (
                <li key={item.number}>
                  <span className="font-mono text-muted">LED-{item.number}</span>{" "}
                  {item.title}
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-8 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
            Labels
          </h2>
          {summary.labels.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No labels in use.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {summary.labels.slice(0, 8).map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between font-mono text-xs">
                    <span>{item.label}</span>
                    <span>{item.count}</span>
                  </div>
                  <Bar value={item.count} max={labelMax} className="bg-ink" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  hot,
}: {
  label: string;
  value: number;
  hot?: boolean;
}) {
  return (
    <div className="border border-rule bg-paper-2/70 p-4">
      <div className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
        {label}
      </div>
      <div
        className={`mt-2 font-[family-name:var(--font-display)] text-4xl ${
          hot && value > 0 ? "text-stamp" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
