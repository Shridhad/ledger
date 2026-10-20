"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createTask,
  deleteTask,
  signOutAction,
  updateTask,
  type TaskDTO,
} from "@/app/actions";
import type { Priority, Status } from "@/db/schema";

const FILTERS: { id: Status | "open" | "all"; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "inbox", label: "Inbox" },
  { id: "doing", label: "Doing" },
  { id: "blocked", label: "Blocked" },
  { id: "shipped", label: "Shipped" },
  { id: "all", label: "All" },
];

function stampClass(status: Status) {
  if (status === "doing") return "text-stamp border-stamp/40";
  if (status === "blocked") return "text-ochre border-ochre/40";
  if (status === "shipped") return "text-moss border-moss/40";
  return "text-slate border-slate/30";
}

function dueLabel(dueOn: string | null) {
  if (!dueOn) return null;
  const due = new Date(`${dueOn}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delta = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (delta < 0) return { text: `${Math.abs(delta)}d late`, hot: true };
  if (delta === 0) return { text: "due today", hot: true };
  if (delta === 1) return { text: "tomorrow", hot: false };
  return { text: dueOn, hot: false };
}

export function Ledger({
  userName,
  userEmail,
  initialTasks,
}: {
  userName: string;
  userEmail: string;
  initialTasks: TaskDTO[];
}) {
  const [items, setItems] = useState(initialTasks);
  const [filter, setFilter] = useState<Status | "open" | "all">("open");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTasks[0]?.id ?? null,
  );
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    return items.filter((task) => {
      if (filter === "open" && task.status === "shipped") return false;
      if (filter !== "open" && filter !== "all" && task.status !== filter) {
        return false;
      }
      if (!query.trim()) return true;
      const hay = `${task.title} ${task.notes} ${task.labels.join(" ")} LED-${task.number}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
  }, [items, filter, query]);

  const selected = items.find((task) => task.id === selectedId) ?? null;

  function upsert(next: TaskDTO) {
    setItems((current) => {
      const without = current.filter((task) => task.id !== next.id);
      return [next, ...without];
    });
    setSelectedId(next.id);
  }

  function onCreate(event: React.FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    startTransition(async () => {
      const result = await createTask({ title });
      if (result.task) upsert(result.task);
    });
  }

  function patch(id: string, next: Parameters<typeof updateTask>[1]) {
    startTransition(async () => {
      const result = await updateTask(id, next);
      if (result.task) upsert(result.task);
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-muted uppercase">
            Personal work ledger
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
            Ledger
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <div className="text-right">
            <div className="text-ink">{userName}</div>
            <div className="font-mono text-xs">{userEmail}</div>
          </div>
          <form action={signOutAction}>
            <button className="border border-rule px-3 py-1.5 text-xs tracking-wide uppercase hover:border-ink">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0">
          <form onSubmit={onCreate} className="flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Capture a task — press return"
              className="w-full border-b border-ink bg-transparent py-2 outline-none placeholder:text-muted"
              autoFocus
            />
            <button
              type="submit"
              disabled={pending}
              className="shrink-0 bg-ink px-4 py-2 text-xs tracking-wide text-paper-2 uppercase"
            >
              File
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`border px-2.5 py-1 font-mono text-[11px] uppercase ${
                  filter === item.id
                    ? "border-ink bg-ink text-paper-2"
                    : "border-rule text-muted hover:border-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="ml-auto w-40 border-b border-rule bg-transparent py-1 text-sm outline-none"
            />
          </div>

          <ul className="ledger-grid mt-4">
            {visible.length === 0 ? (
              <li className="py-10 text-muted">Nothing in this column. File a task above.</li>
            ) : (
              visible.map((task) => {
                const due = dueLabel(task.dueOn);
                return (
                  <li key={task.id}>
                    <button
                      onClick={() => setSelectedId(task.id)}
                      className={`grid w-full grid-cols-[4.5rem_1fr_auto] items-center gap-3 py-2 text-left ${
                        selectedId === task.id ? "bg-black/4" : ""
                      }`}
                    >
                      <span className="font-mono text-xs text-muted">
                        LED-{task.number}
                      </span>
                      <span className="truncate">{task.title}</span>
                      <span className="flex items-center gap-2">
                        {due ? (
                          <span
                            className={`font-mono text-[10px] uppercase ${due.hot ? "text-stamp" : "text-muted"}`}
                          >
                            {due.text}
                          </span>
                        ) : null}
                        <span
                          className={`border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase ${stampClass(task.status)}`}
                        >
                          {task.status}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <aside className="border border-rule bg-paper-2/70 p-4">
          {selected ? (
            <TaskInspector
              key={selected.id}
              task={selected}
              pending={pending}
              onPatch={patch}
              onDelete={() => {
                startTransition(async () => {
                  await deleteTask(selected.id);
                  setItems((current) => current.filter((task) => task.id !== selected.id));
                  setSelectedId(null);
                });
              }}
            />
          ) : (
            <p className="text-sm text-muted">
              Select a row to inspect it. This is a personal ledger — every task belongs to your
              signed-in user, including tools called from MCP clients.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function TaskInspector({
  task,
  pending,
  onPatch,
  onDelete,
}: {
  task: TaskDTO;
  pending: boolean;
  onPatch: (id: string, patch: Parameters<typeof updateTask>[1]) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [labels, setLabels] = useState(task.labels.join(", "));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted">LED-{task.number}</span>
        <span
          className={`border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase ${stampClass(task.status)}`}
        >
          {task.priority}
        </span>
      </div>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => title.trim() && title !== task.title && onPatch(task.id, { title })}
        className="border-b border-rule bg-transparent pb-1 text-lg outline-none"
      />
      <label className="text-xs tracking-wide text-muted uppercase">
        Status
        <select
          value={task.status}
          onChange={(event) => onPatch(task.id, { status: event.target.value as Status })}
          className="mt-1 block w-full border border-rule bg-transparent px-2 py-1.5 text-sm text-ink"
        >
          <option value="inbox">Inbox</option>
          <option value="doing">Doing</option>
          <option value="blocked">Blocked</option>
          <option value="shipped">Shipped</option>
        </select>
      </label>
      <label className="text-xs tracking-wide text-muted uppercase">
        Priority
        <select
          value={task.priority}
          onChange={(event) =>
            onPatch(task.id, { priority: event.target.value as Priority })
          }
          className="mt-1 block w-full border border-rule bg-transparent px-2 py-1.5 text-sm text-ink"
        >
          <option value="p0">P0 — drop everything</option>
          <option value="p1">P1 — this week</option>
          <option value="p2">P2 — whenever</option>
        </select>
      </label>
      <label className="text-xs tracking-wide text-muted uppercase">
        Due
        <input
          type="date"
          value={task.dueOn ?? ""}
          onChange={(event) => onPatch(task.id, { dueOn: event.target.value || null })}
          className="mt-1 block w-full border border-rule bg-transparent px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs tracking-wide text-muted uppercase">
        Labels
        <input
          value={labels}
          onChange={(event) => setLabels(event.target.value)}
          onBlur={() =>
            onPatch(task.id, {
              labels: labels
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean),
            })
          }
          placeholder="backend, launch, hiring"
          className="mt-1 block w-full border border-rule bg-transparent px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs tracking-wide text-muted uppercase">
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => notes !== task.notes && onPatch(task.id, { notes })}
          rows={7}
          className="mt-1 block w-full border border-rule bg-transparent px-2 py-1.5 text-sm leading-6"
        />
      </label>
      <button
        disabled={pending}
        onClick={onDelete}
        className="self-start text-xs tracking-wide text-stamp uppercase"
      >
        Strike from ledger
      </button>
    </div>
  );
}
