import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const kdsStationsSqlite = sqliteTable("kds_stations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isMaster: integer("is_master").notNull().default(0),
  groupIds: text("group_ids").notNull().default("[]"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
