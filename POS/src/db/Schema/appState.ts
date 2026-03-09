import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Generic key-value store for app-level configuration.
 * Keys: "paired_kiosk_id", "kiosk_position" ("SAME" | "DISTANCE"), "local_ip", etc.
 */
export const appState = sqliteTable("app_state", {
  key:   text("key").primaryKey(),
  value: text("value").notNull(),
});
