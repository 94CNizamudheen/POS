import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const kdsTicketsSqlite = sqliteTable("kds_tickets", {
  id: text("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull(),
  orderId: text("order_id"),
  orderModeName: text("order_mode_name"),
  status: text("status", {
    enum: ["PENDING", "IN_PROGRESS", "READY"],
  })
    .notNull()
    .default("PENDING"),
  items: text("items").notNull(),
  totalAmount: integer("total_amount"),
  tokenNumber: integer("token_number"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
