import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summaryFromTasks, type TaskSummaryRow } from "./report-summary.ts";

function task(
  partial: Partial<TaskSummaryRow> & Pick<TaskSummaryRow, "number" | "title" | "status">,
): TaskSummaryRow {
  return {
    notes: "",
    priority: "p2",
    dueOn: null,
    labels: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
    ...partial,
  };
}

describe("summaryFromTasks", () => {
  const now = new Date("2026-10-30T12:00:00.000Z");
  const user = { id: "u1", name: "Ada", email: "ada@example.com" };

  it("counts open, overdue, blocked, and shipped-this-week", () => {
    const summary = summaryFromTasks(
      [
        task({ number: 1, title: "Old inbox", status: "inbox", dueOn: "2026-10-01" }),
        task({ number: 2, title: "Doing", status: "doing", priority: "p0" }),
        task({
          number: 3,
          title: "Blocked",
          status: "blocked",
          notes: "wait",
          labels: ["launch"],
        }),
        task({
          number: 4,
          title: "Shipped recently",
          status: "shipped",
          completedAt: "2026-10-28T00:00:00.000Z",
        }),
        task({
          number: 5,
          title: "Shipped last month",
          status: "shipped",
          completedAt: "2026-09-01T00:00:00.000Z",
        }),
      ],
      { user, now },
    );

    assert.equal(summary.totals.all, 5);
    assert.equal(summary.totals.open, 3);
    assert.equal(summary.totals.overdue, 1);
    assert.equal(summary.totals.inbox, 1);
    assert.equal(summary.totals.doing, 1);
    assert.equal(summary.totals.blocked, 1);
    assert.equal(summary.totals.shipped, 2);
    assert.equal(summary.priorities.p0, 1);
    assert.equal(summary.oldestOpen?.number, 1);
    assert.equal(summary.blocked[0]?.title, "Blocked");
    assert.deepEqual(
      summary.recentlyShipped.map((row) => row.number),
      [4],
    );
    assert.equal(summary.user.email, "ada@example.com");
  });
});
