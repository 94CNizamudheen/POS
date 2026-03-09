import { invoke } from "@tauri-apps/api/core";

type Theme = "light" | "dark";
type KioskPosition = "SAME" | "DISTANCE";

const get = (key: string) =>
  invoke<string | null>("get_app_state", { key });

const set = (key: string, value: string) =>
  invoke<void>("set_app_state", { key, value });

export const appLocalService = {
  // ── Theme ──────────────────────────────────────────────────────────────
  getTheme: (): Promise<Theme | null> =>
    get("theme").then((v) => (v === "dark" || v === "light" ? v : null)),

  setTheme: (theme: Theme): Promise<void> => set("theme", theme),

  // ── Paired kiosk ───────────────────────────────────────────────────────
  getPairedKioskId: (): Promise<string | null> =>
    get("paired_kiosk_id").then((v) => (v && v.length > 0 ? v : null)),

  setPairedKioskId: (kioskId: string): Promise<void> =>
    set("paired_kiosk_id", kioskId),

  clearPairedKioskId: (): Promise<void> => set("paired_kiosk_id", ""),

  // ── Kiosk position ─────────────────────────────────────────────────────
  getKioskPosition: (kioskId: string): Promise<KioskPosition | null> =>
    get(`kiosk_position_${kioskId}`).then((v) =>
      v === "SAME" || v === "DISTANCE" ? v : null,
    ),

  setKioskPosition: (kioskId: string, pos: KioskPosition): Promise<void> =>
    set(`kiosk_position_${kioskId}`, pos),
};
