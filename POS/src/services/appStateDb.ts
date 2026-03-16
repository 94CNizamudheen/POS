import { invoke } from "@tauri-apps/api/core";
import type { AppState } from "@/types/appState";

export const appStateApi = {
  get(): Promise<AppState> {
    return invoke("get_app_state");
  },

  // ── KDS ──────────────────────────────────────────────────────────────────

  setKdsWsUrl(wsUrl: string): Promise<void> {
    return invoke("set_kds_ws_url", { wsUrl });
  },

  setKdsTerminalId(terminalId: string): Promise<void> {
    return invoke("set_kds_terminal_id", { terminalId });
  },

  setKdsDisplaySettings(settings: string): Promise<void> {
    return invoke("set_kds_display_settings", { settings });
  },

  setKdsGroups(groups: string): Promise<void> {
    return invoke("set_kds_groups", { groups });
  },

  // ── Queue Display ─────────────────────────────────────────────────────────

  setQueueWsUrl(wsUrl: string): Promise<void> {
    return invoke("set_queue_ws_url", { wsUrl });
  },

  setQueueTerminalId(terminalId: string): Promise<void> {
    return invoke("set_queue_terminal_id", { terminalId });
  },

  // ── Customer Display ──────────────────────────────────────────────────────

  setCdWsUrl(wsUrl: string): Promise<void> {
    return invoke("set_cd_ws_url", { wsUrl });
  },

  setCdTerminalId(terminalId: string): Promise<void> {
    return invoke("set_cd_terminal_id", { terminalId });
  },

  setCdSettings(settings: string): Promise<void> {
    return invoke("set_cd_settings", { settings });
  },

  // ── Kiosk ─────────────────────────────────────────────────────────────────

  setKioskPosUrl(posUrl: string): Promise<void> {
    return invoke("set_kiosk_pos_url", { posUrl });
  },

  setKioskTerminalId(terminalId: string): Promise<void> {
    return invoke("set_kiosk_terminal_id", { terminalId });
  },

  setKioskPosition(position: string): Promise<void> {
    return invoke("set_kiosk_position", { position });
  },

  // ── Device ────────────────────────────────────────────────────────────────

  setDeviceRole(role: string): Promise<void> {
    return invoke("set_device_role", { role });
  },

  // ── Data management ───────────────────────────────────────────────────────

  clearAllData(): Promise<void> {
    return invoke("clear_all_data");
  },
};
