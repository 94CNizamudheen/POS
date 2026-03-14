import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const queueTokens = sqliteTable("queue_tokens", {
  id: text("id").primaryKey().notNull(),
  ticketId: text("ticket_id"),
  ticketNumber: text("ticket_number"),
  tokenNumber: integer("token_number").notNull(),
  status: text("status", { enum: ["WAITING", "CALLED", "SERVED"] })
    .notNull()
    .default("WAITING"),
  source: text("source"),
  orderMode: text("order_mode"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  calledAt: text("called_at"),
  servedAt: text("served_at"),
});
