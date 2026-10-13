import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js";
export const tasksStatus = pgEnum("task_status", ["processing", "completed"]);
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: tasksStatus("status").default("processing"),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at"),
});
