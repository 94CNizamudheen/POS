import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const heldOrders = sqliteTable("held_orders", {
  id:          text("id").primaryKey(),
  orderId:     text("order_id").notNull().unique(),
  orderNumber: text("order_number").notNull(),
  /** Full Order object serialised as JSON — restored verbatim on resume */
  orderJson:   text("order_json").notNull(),
  total:       real("total").notNull().default(0),
  heldAt:      integer("held_at").notNull(),
});
