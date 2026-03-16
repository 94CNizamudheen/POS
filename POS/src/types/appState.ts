/** Mirrors the Rust AppState struct returned by get_app_state(). */
export interface AppState {
  // KDS
  kds_ws_url: string | null;
  kds_terminal_id: string | null;
  kds_display_settings: string | null;
  kds_groups: string | null;
  // Queue Display
  queue_ws_url: string | null;
  queue_terminal_id: string | null;
  // Customer Display
  cd_ws_url: string | null;
  cd_terminal_id: string | null;
  cd_settings: string | null;
  // Kiosk
  kiosk_pos_url: string | null;
  kiosk_terminal_id: string | null;
  kiosk_position: string | null;
  // Device
  device_role: string | null;
}
