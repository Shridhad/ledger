import {
  date,
  integer,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const neonAuth = pgSchema("neon_auth");

export const userInNeonAuth = neonAuth.table(
  "user",
  {
    id: uuid().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    image: text(),
  },
  (table) => [unique("user_email_key").on(table.email)],
);

export const statuses = ["inbox", "doing", "blocked", "shipped"] as const;
export const priorities = ["p0", "p1", "p2"] as const;

export type Status = (typeof statuses)[number];
export type Priority = (typeof priorities)[number];

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userInNeonAuth.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    status: text("status").$type<Status>().notNull().default("inbox"),
    priority: text("priority").$type<Priority>().notNull().default("p2"),
    dueOn: date("due_on", { mode: "string" }),
    labels: text("labels").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [unique("tasks_user_number").on(table.userId, table.number)],
);

export type Task = typeof tasks.$inferSelect;
