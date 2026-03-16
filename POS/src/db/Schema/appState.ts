import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Single-row app configuration table (id always = 1).
 * Each setting is a named column — no key-value rows.
 */
export const appState = sqliteTable("app_state", {
  id: integer("id").primaryKey(), // always 1

  // KDS settings
  kdsWsUrl: text("kds_ws_url").default(""),
  kdsTerminalId: text("kds_terminal_id").default(""),
  kdsDisplaySettings: text("kds_display_settings").default("{}"),
  kdsGroups: text("kds_groups").default("[]"),

  // Queue Display settings
  queueWsUrl: text("queue_ws_url").default(""),
  queueTerminalId: text("queue_terminal_id").default(""),

  // Customer Display settings
  cdWsUrl: text("cd_ws_url").default(""),
  cdTerminalId: text("cd_terminal_id").default(""),
  cdSettings: text("cd_settings").default("{}"),

  // Kiosk settings
  kioskPosUrl: text("kiosk_pos_url").default(""),
  kioskTerminalId: text("kiosk_terminal_id").default(""),
  kioskPosition: text("kiosk_position").default("DISTANCE"),

  // Device role
  deviceRole: text("device_role").default(""),

  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
});
