import { Hono } from "hono";
import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpAuth } from "@neon/oauth/mcp";
import { honoMcp, type McpAuthVariables } from "@neon/oauth/mcp/hono";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import { tasks, type Priority, type Status } from "../../src/db/schema";

const AUTH_URL = process.env.NEON_AUTH_BASE_URL!;
const RESOURCE = process.env.MCP_RESOURCE!;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const mcpAuth = createMcpAuth({
  baseUrl: AUTH_URL,
  resource: RESOURCE,
});

const statusFilter = z.enum(["inbox", "doing", "blocked", "shipped", "open", "all"]);
const statusValue = z.enum(["inbox", "doing", "blocked", "shipped"]);
const priorityValue = z.enum(["p0", "p1", "p2"]);

function asText(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function createServer(userId: string) {
  const server = new McpServer({ name: "ledger", version: "1.0.0" });

  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description: "Return the signed-in Ledger user id for this token.",
      inputSchema: {},
    },
    async () => asText({ userId }),
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "List Ledger tasks for the signed-in user.",
      inputSchema: {
        status: statusFilter.optional().describe("Filter by status. open omits shipped."),
        query: z.string().optional(),
        limit: z.number().int().positive().max(100).optional(),
      },
    },
    async ({ status = "open", query, limit = 40 }) => {
      const clauses = [eq(tasks.userId, userId)];
      if (status === "open") clauses.push(sql`${tasks.status} <> 'shipped'`);
      else if (status !== "all") clauses.push(eq(tasks.status, status));
      if (query?.trim()) {
        const q = `%${query.trim()}%`;
        clauses.push(or(ilike(tasks.title, q), ilike(tasks.notes, q))!);
      }
      const rows = await db
        .select()
        .from(tasks)
        .where(and(...clauses))
        .orderBy(desc(tasks.updatedAt))
        .limit(limit);
      return asText({ count: rows.length, tasks: rows });
    },
  );

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description: "File a new task in the signed-in user's ledger.",
      inputSchema: {
        title: z.string().trim().min(1),
        notes: z.string().optional(),
        status: statusValue.optional(),
        priority: priorityValue.optional(),
        due_on: z.string().optional(),
        labels: z.array(z.string()).optional(),
      },
    },
    async ({ title, notes, status, priority, due_on, labels }) => {
      const [maxRow] = await db
        .select({ max: sql<number>`coalesce(max(${tasks.number}), 0)` })
        .from(tasks)
        .where(eq(tasks.userId, userId));
      const [row] = await db
        .insert(tasks)
        .values({
          userId,
          title,
          notes: notes ?? "",
          status: (status as Status) ?? "inbox",
          priority: (priority as Priority) ?? "p2",
          dueOn: due_on || null,
          labels: (labels ?? []).map((label) => label.trim().toLowerCase()).filter(Boolean),
          number: (maxRow?.max ?? 0) + 1,
        })
        .returning();
      return asText({ created: row });
    },
  );

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description: "Update a task by LED number or id.",
      inputSchema: {
        id: z.string().uuid().optional(),
        number: z.number().int().positive().optional(),
        title: z.string().optional(),
        notes: z.string().optional(),
        status: statusValue.optional(),
        priority: priorityValue.optional(),
        due_on: z.string().nullable().optional(),
        labels: z.array(z.string()).optional(),
      },
    },
    async ({ id, number, ...fields }) => {
      if (!id && !number) return asText({ error: "Provide id or number." });
      const where = id
        ? and(eq(tasks.id, id), eq(tasks.userId, userId))
        : and(eq(tasks.number, number!), eq(tasks.userId, userId));
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (fields.title !== undefined) updates.title = fields.title;
      if (fields.notes !== undefined) updates.notes = fields.notes;
      if (fields.status !== undefined) {
        updates.status = fields.status;
        updates.completedAt = fields.status === "shipped" ? new Date() : null;
      }
      if (fields.priority !== undefined) updates.priority = fields.priority;
      if (fields.due_on !== undefined) updates.dueOn = fields.due_on;
      if (fields.labels !== undefined) {
        updates.labels = fields.labels.map((label) => label.trim().toLowerCase()).filter(Boolean);
      }
      const [row] = await db.update(tasks).set(updates).where(where).returning();
      return asText(row ? { updated: row } : { error: "Task not found." });
    },
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete task",
      description: "Mark a task shipped.",
      inputSchema: {
        id: z.string().uuid().optional(),
        number: z.number().int().positive().optional(),
      },
    },
    async ({ id, number }) => {
      if (!id && !number) return asText({ error: "Provide id or number." });
      const where = id
        ? and(eq(tasks.id, id), eq(tasks.userId, userId))
        : and(eq(tasks.number, number!), eq(tasks.userId, userId));
      const [row] = await db
        .update(tasks)
        .set({ status: "shipped", completedAt: new Date(), updatedAt: new Date() })
        .where(where)
        .returning();
      return asText(row ? { shipped: row } : { error: "Task not found." });
    },
  );

  return server;
}

const app = new Hono<McpAuthVariables>();
app.use(honoMcp(mcpAuth, { path: "/mcp" }));

app.get("/", (c) =>
  c.json({
    name: "Ledger MCP",
    mcp: "/mcp",
    resource: RESOURCE,
    authorization_server: AUTH_URL,
  }),
);

app.all("/mcp", async (c) => {
  const auth = c.get("auth");
  const server = createServer(auth.sub);
  const transport = new StreamableHTTPTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(c);
});

export default app;
