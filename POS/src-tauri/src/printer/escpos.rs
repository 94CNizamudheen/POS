use serde::{Deserialize, Serialize};

/// Printer configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterConfig {
    pub id: String,
    pub name: String,
    pub printer_type: String, // "network", "usb", "bluetooth", "builtin", "system"
    pub ip_address: Option<String>,
    pub port: Option<u16>,
    pub bluetooth_address: Option<String>,
    pub paper_width: Option<String>,    // "58mm" or "80mm"
    pub chars_per_line: Option<i32>,    // 32 for 58mm, 48 for 80mm
    pub is_active: bool,
}
