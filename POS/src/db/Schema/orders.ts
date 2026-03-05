import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  orderId:          text("order_id").primaryKey(),
  orderNumber:      text("order_number").notNull(),
  status:           text("status").notNull(),
  itemsJson:        text("items_json").notNull(),
  subtotal:         real("subtotal").notNull(),
  tax:              real("tax").notNull(),
  total:            real("total").notNull(),
  originTerminalId: text("origin_terminal_id").notNull(),
  originType:       text("origin_type").notNull(),
  ownerTerminalId:  text("owner_terminal_id"),
  ownerType:        text("owner_type"),
  createdAt:        integer("created_at").notNull(),
  updatedAt:        integer("updated_at").notNull(),
  expiresAt:        integer("expires_at").notNull(),
  completedAt:      integer("completed_at"),
  paymentMethod:    text("payment_method"),
  notes:            text("notes"),
});
