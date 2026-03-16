#[derive(Debug, serde::Serialize)]
pub struct AppState {
    // KDS
    pub kds_ws_url: Option<String>,
    pub kds_terminal_id: Option<String>,
    pub kds_display_settings: Option<String>,
    pub kds_groups: Option<String>,
    // Queue Display
    pub queue_ws_url: Option<String>,
    pub queue_terminal_id: Option<String>,
    // Customer Display
    pub cd_ws_url: Option<String>,
    pub cd_terminal_id: Option<String>,
    pub cd_settings: Option<String>,
    // Kiosk
    pub kiosk_pos_url: Option<String>,
    pub kiosk_terminal_id: Option<String>,
    pub kiosk_position: Option<String>,
    // Device
    pub device_role: Option<String>,
}
