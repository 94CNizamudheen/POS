use std::io::Write;
use std::net::TcpStream;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use super::escpos::PrinterConfig;

#[cfg(target_os = "android")]
use super::system_print;

/// ===============================
/// SYSTEM PRINTER MODEL
/// ===============================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemPrinter {
    pub name: String,
    pub system_name: String,
    pub driver_name: Option<String>,
    pub port_name: Option<String>,
    pub is_default: bool,
    pub is_shared: bool,
}

pub struct PrinterService;

impl PrinterService {
    // =========================================================
    // SYSTEM PRINTER LISTING
    // =========================================================

    /// Desktop only (Windows/macOS/Linux)
    #[cfg(not(target_os = "android"))]
    pub fn get_system_printers() -> Result<Vec<SystemPrinter>, String> {
        let system_printers = printers::get_printers();

        let default_printer = printers::get_default_printer();

        let result: Vec<SystemPrinter> = system_printers
            .into_iter()
            .map(|p| {
                let is_default = default_printer
                    .as_ref()
                    .map(|d| d.name == p.name)
                    .unwrap_or(false);

                SystemPrinter {
                    name: p.name.clone(),
                    system_name: p.name.clone(),
                    driver_name: None,
                    port_name: None,
                    is_default,
                    is_shared: false,
                }
            })
            .collect();

        Ok(result)
    }

    /// Android returns empty (handled via intent)
    #[cfg(target_os = "android")]
    pub fn get_system_printers() -> Result<Vec<SystemPrinter>, String> {
        Ok(vec![])
    }

    // =========================================================
    // ANDROID SYSTEM PRINT
    // =========================================================

    #[cfg(target_os = "android")]
    pub fn print_android_system(data: &[u8]) -> Result<(), String> {
        use std::env::temp_dir;
        use std::fs;

        let temp_path = temp_dir().join("cloudcode_print.bin");

        fs::write(&temp_path, data).map_err(|e| format!("Failed to write print buffer: {}", e))?;

        system_print::launch_print_intent(temp_path)
    }

    // =========================================================
    // DESKTOP SYSTEM PRINT
    // =========================================================

    #[cfg(not(target_os = "android"))]
    pub fn print_to_system_printer(printer_name: &str, data: &[u8]) -> Result<(), String> {
        use printers::common::base::job::PrinterJobOptions;

        let printer = printers::get_printer_by_name(printer_name)
            .ok_or_else(|| format!("Printer '{}' not found", printer_name))?;

        let options = PrinterJobOptions::none();

        printer
            .print(data, options)
            .map_err(|e| format!("Print failed: {:?}", e))?;

        Ok(())
    }

    #[cfg(target_os = "android")]
    pub fn print_to_system_printer(_printer_name: &str, _data: &[u8]) -> Result<(), String> {
        Err("System spooler not used on Android".to_string())
    }

    // =========================================================
    // BLUETOOTH / SERIAL COM PORT (Desktop)
    // =========================================================

    #[cfg(not(target_os = "android"))]
    pub fn list_bluetooth_ports() -> Vec<(String, String, bool)> {
        use serialport::available_ports;

        #[cfg(target_os = "windows")]
        let info_map = Self::windows_com_port_info();

        match available_ports() {
            Ok(ports) => ports
                .into_iter()
                .map(|p| {
                    #[cfg(target_os = "windows")]
                    {
                        let (label, is_bt) = info_map
                            .get(&p.port_name)
                            .cloned()
                            .unwrap_or_else(|| (p.port_name.clone(), false));
                        (p.port_name, label, is_bt)
                    }

                    #[cfg(not(target_os = "windows"))]
                    {
                        use serialport::SerialPortType;
                        let (label, is_bt) = match &p.port_type {
                            SerialPortType::BluetoothPort => (p.port_name.clone(), true),
                            SerialPortType::UsbPort(_) => (p.port_name.clone(), false),
                            _ => (p.port_name.clone(), false),
                        };
                        (p.port_name, label, is_bt)
                    }
                })
                .collect(),
            Err(_) => vec![],
        }
    }

    #[cfg(target_os = "windows")]
    fn windows_com_port_info() -> std::collections::HashMap<String, (String, bool)> {
        use winreg::{enums::HKEY_LOCAL_MACHINE, RegKey};

        let mut map: std::collections::HashMap<String, (String, bool)> =
            std::collections::HashMap::new();
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        // ── 1. BTHENUM / BTH  (highest priority — real printer names) ───────────
        for bt_root in &[
            r"SYSTEM\CurrentControlSet\Enum\BTHENUM",
            r"SYSTEM\CurrentControlSet\Enum\BTH",
        ] {
            let Ok(bth_key) = hklm.open_subkey(bt_root) else {
                continue;
            };
            for dev_id in bth_key.enum_keys().flatten() {
                let Ok(dev_key) = bth_key.open_subkey(&dev_id) else {
                    continue;
                };
                for inst_id in dev_key.enum_keys().flatten() {
                    let Ok(inst) = dev_key.open_subkey(&inst_id) else {
                        continue;
                    };
                    let friendly: String = inst.get_value("FriendlyName").unwrap_or_default();
                    if let Ok(params) = inst.open_subkey("Device Parameters") {
                        let port: String = params.get_value("PortName").unwrap_or_default();
                        if !port.is_empty() && !friendly.is_empty() {
                            let clean = friendly
                                .replace(&format!("({})", port), "")
                                .trim()
                                .to_string();
                            map.insert(port, (clean, true));
                        }
                    }
                }
            }
        }

        // ── 2. Serial port device class  (fallback) ─────
        if let Ok(class_key) = hklm.open_subkey(
            r"SYSTEM\CurrentControlSet\Control\Class\{4D36E978-E325-11CE-BFC1-08002BE10318}",
        ) {
            for key_name in class_key.enum_keys().flatten() {
                let Ok(dev) = class_key.open_subkey(&key_name) else {
                    continue;
                };
                let friendly: String = dev.get_value("FriendlyName").unwrap_or_default();
                if let Ok(params) = dev.open_subkey("Device Parameters") {
                    let port: String = params.get_value("PortName").unwrap_or_default();
                    if port.is_empty() || map.contains_key(&port) {
                        continue;
                    }
                    let clean = friendly
                        .replace(&format!("({})", port), "")
                        .trim()
                        .to_string();
                    let label = if clean.is_empty() {
                        port.clone()
                    } else {
                        clean
                    };
                    let is_bt = label.to_lowercase().contains("bluetooth");
                    map.insert(port, (label, is_bt));
                }
            }
        }

        // ── 3. HARDWARE\DEVICEMAP\SERIALCOMM  (last resort) ─────────────────────
        if let Ok(serialcomm) = hklm.open_subkey(r"HARDWARE\DEVICEMAP\SERIALCOMM") {
            for (device_path, reg_val) in serialcomm.enum_values().flatten() {
                let port: String = reg_val.to_string().trim_matches('"').to_string();
                if port.is_empty() || map.contains_key(&port) {
                    continue;
                }
                let lower = device_path.to_lowercase();
                let is_bt =
                    lower.contains("bth") || lower.contains("bluetooth") || lower.contains("modem");
                map.insert(port.clone(), (port, is_bt));
            }
        }

        map
    }

    #[cfg(target_os = "android")]
    pub fn list_bluetooth_ports() -> Vec<(String, String, bool)> {
        vec![]
    }

    /// Print to a Bluetooth printer via its virtual COM port (desktop only).
    #[cfg(not(target_os = "android"))]
    pub fn print_bluetooth_serial(port_name: &str, data: &[u8]) -> Result<(), String> {
        use std::time::Duration;

        let mut port = serialport::new(port_name, 115200)
            .timeout(Duration::from_secs(10))
            .open()
            .map_err(|e| format!("Cannot open Bluetooth port '{}': {}", port_name, e))?;

        port.write_all(data)
            .map_err(|e| format!("Bluetooth write failed: {}", e))?;

        port.flush()
            .map_err(|e| format!("Bluetooth flush failed: {}", e))?;

        Ok(())
    }

    #[cfg(target_os = "android")]
    pub fn print_bluetooth_serial(_port_name: &str, _data: &[u8]) -> Result<(), String> {
        Err("Bluetooth serial print handled via Android bridge".to_string())
    }

    // =========================================================
    // TEST PRINT
    // =========================================================

    pub fn test_print(config: &PrinterConfig) -> Result<(), String> {
        #[cfg(target_os = "android")]
        if config.printer_type == "bluetooth" {
            return Ok(());
        }

        let test_commands: Vec<u8> = vec![
            0x1B, 0x40, 0x1B, 0x61, 0x01, 0x1D, 0x21, 0x11, b'T', b'E', b'S', b'T', 0x0A, 0x1D,
            0x21, 0x00, 0x0A, b'P', b'r', b'i', b'n', b't', b'e', b'r', b' ', b'O', b'K', 0x0A,
            0x0A, 0x1D, 0x56, 0x00,
        ];

        match config.printer_type.as_str() {
            "network" => {
                let ip = config
                    .ip_address
                    .as_ref()
                    .ok_or("IP address not configured")?;

                let port = config.port.unwrap_or(9100);
                let address = format!("{}:{}", ip, port);

                let stream = TcpStream::connect_timeout(
                    &address
                        .parse()
                        .map_err(|e| format!("Invalid address: {}", e))?,
                    Duration::from_secs(5),
                )
                .map_err(|e| format!("Connect failed: {}", e))?;

                let mut stream = stream;
                stream
                    .set_write_timeout(Some(Duration::from_secs(10)))
                    .map_err(|e| format!("Timeout set failed: {}", e))?;
                stream
                    .write_all(&test_commands)
                    .map_err(|e| format!("Write failed: {}", e))?;
                stream.flush().map_err(|e| format!("Flush failed: {}", e))?;

                Ok(())
            }

            "system" => {
                #[cfg(target_os = "android")]
                {
                    Self::print_android_system(&test_commands)
                }

                #[cfg(not(target_os = "android"))]
                {
                    Self::print_to_system_printer(&config.name, &test_commands)
                }
            }

            "usb" => Self::print_to_system_printer(&config.name, &test_commands),

            "bluetooth" => {
                let port = config
                    .bluetooth_address
                    .as_ref()
                    .ok_or("Bluetooth port/address not configured")?;
                Self::print_bluetooth_serial(port, &test_commands)
            }

            "builtin" => Err("Builtin printer handled via Android JS bridge".to_string()),

            _ => Err(format!("Unsupported printer type: {}", config.printer_type)),
        }
    }

    // =========================================================
    // RAW PRINT
    // =========================================================

    pub fn print_raw(config: &PrinterConfig, data: &[u8]) -> Result<(), String> {
        #[cfg(target_os = "android")]
        if config.printer_type == "bluetooth" {
            return Ok(());
        }

        match config.printer_type.as_str() {
            "network" => {
                let ip = config.ip_address.as_ref().ok_or("IP not configured")?;

                let port = config.port.unwrap_or(9100);
                let address = format!("{}:{}", ip, port);

                let stream = TcpStream::connect_timeout(
                    &address
                        .parse()
                        .map_err(|e| format!("Invalid address: {}", e))?,
                    Duration::from_secs(5),
                )
                .map_err(|e| format!("Connect failed: {}", e))?;

                let mut stream = stream;
                stream
                    .set_write_timeout(Some(Duration::from_secs(10)))
                    .map_err(|e| format!("Timeout set failed: {}", e))?;
                stream
                    .write_all(data)
                    .map_err(|e| format!("Write failed: {}", e))?;
                stream.flush().map_err(|e| format!("Flush failed: {}", e))?;

                Ok(())
            }

            "system" => {
                #[cfg(target_os = "android")]
                {
                    return Self::print_android_system(data);
                }

                #[cfg(not(target_os = "android"))]
                {
                    Self::print_to_system_printer(&config.name, data)
                }
            }

            "usb" => Self::print_to_system_printer(&config.name, data),

            "bluetooth" => {
                let port = config
                    .bluetooth_address
                    .as_ref()
                    .ok_or("Bluetooth port/address not configured")?;
                Self::print_bluetooth_serial(port, data)
            }

            "builtin" => Err("Builtin printer must be printed via Android JS bridge".to_string()),

            _ => Err(format!("Unsupported printer type: {}", config.printer_type)),
        }
    }
}
