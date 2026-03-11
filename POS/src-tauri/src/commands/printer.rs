use crate::db::migrate;
use crate::db::models::printer::Printer;
use crate::db::models::printer_repo::PrinterRepo;
use crate::printer::{PrinterConfig, PrinterService, SystemPrinter};
use tauri::{command, AppHandle};

#[command]
pub fn get_printers(app: AppHandle) -> Result<Vec<Printer>, String> {
    let conn = migrate::connection(&app);
    PrinterRepo::get_all(&conn).map_err(|e| format!("Failed to get printers: {}", e))
}

#[command]
pub fn get_active_printers(app: AppHandle) -> Result<Vec<Printer>, String> {
    let conn = migrate::connection(&app);
    PrinterRepo::get_active(&conn).map_err(|e| format!("Failed to get active printers: {}", e))
}

#[command]
pub fn get_printer(app: AppHandle, id: String) -> Result<Option<Printer>, String> {
    let conn = migrate::connection(&app);
    PrinterRepo::get_by_id(&conn, &id).map_err(|e| format!("Failed to get printer: {}", e))
}

#[command]
pub fn save_printer(app: AppHandle, printer: Printer) -> Result<(), String> {
    let conn = migrate::connection(&app);
    PrinterRepo::save(&conn, &printer).map_err(|e| format!("Failed to save printer: {}", e))
}

#[command]
pub fn delete_printer(app: AppHandle, id: String) -> Result<(), String> {
    let conn = migrate::connection(&app);
    PrinterRepo::delete(&conn, &id).map_err(|e| format!("Failed to delete printer: {}", e))
}

#[command]
pub fn set_printer_active(app: AppHandle, id: String, is_active: bool) -> Result<(), String> {
    let conn = migrate::connection(&app);
    PrinterRepo::set_active(&conn, &id, is_active)
        .map_err(|e| format!("Failed to update printer status: {}", e))
}

#[command]
pub fn test_printer(printer: Printer) -> Result<(), String> {
    let config = PrinterConfig {
        id: printer.id,
        name: printer.name,
        printer_type: printer.printer_type,
        ip_address: printer.ip_address,
        port: printer.port.map(|p| p as u16),
        bluetooth_address: printer.bluetooth_address,
        paper_width: printer.paper_width,
        chars_per_line: printer.chars_per_line,
        is_active: printer.is_active,
    };

    PrinterService::test_print(&config)
}

/// Print raw ESC/POS data to a specific printer.
/// The data should be base64-encoded ESC/POS commands from TypeScript.
#[command]
pub fn print_raw(app: AppHandle, printer_id: String, data: String) -> Result<(), String> {
    let conn = migrate::connection(&app);

    let printer = PrinterRepo::get_by_id(&conn, &printer_id)
        .map_err(|e| format!("Failed to get printer: {}", e))?
        .ok_or("Printer not found")?;

    if !printer.is_active {
        return Err("Printer is not active".to_string());
    }

    if printer.printer_type == "builtin" {
        return Ok(());
    }

    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let raw_bytes = STANDARD
        .decode(&data)
        .map_err(|e| format!("Failed to decode base64 data: {}", e))?;

    let config = PrinterConfig {
        id: printer.id,
        name: printer.name,
        printer_type: printer.printer_type.clone(),
        ip_address: printer.ip_address,
        port: printer.port.map(|p| p as u16),
        bluetooth_address: printer.bluetooth_address,
        paper_width: printer.paper_width,
        chars_per_line: printer.chars_per_line,
        is_active: printer.is_active,
    };

    #[cfg(target_os = "android")]
    {
        if config.printer_type == "system" {
            return PrinterService::print_android_system(&raw_bytes);
        }
        if config.printer_type == "bluetooth" {
            return Ok(());
        }
    }

    PrinterService::print_raw(&config, &raw_bytes)
}

// ============== BLUETOOTH PORT COMMANDS ==============

#[command]
pub fn list_bluetooth_ports() -> Result<Vec<serde_json::Value>, String> {
    let ports = PrinterService::list_bluetooth_ports();
    Ok(ports
        .into_iter()
        .map(|(name, label, is_bt)| {
            serde_json::json!({ "name": name, "label": label, "is_bluetooth": is_bt })
        })
        .collect())
}

// ============== SYSTEM PRINTER COMMANDS ==============

#[command]
pub fn get_system_printers() -> Result<Vec<SystemPrinter>, String> {
    PrinterService::get_system_printers()
}

#[command]
pub fn print_to_system_printer(printer_name: String, data: String) -> Result<(), String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let raw_bytes = STANDARD
        .decode(&data)
        .map_err(|e| format!("Failed to decode base64 data: {}", e))?;

    PrinterService::print_to_system_printer(&printer_name, &raw_bytes)
}

#[command]
pub fn add_system_printer_to_app(
    app: AppHandle,
    system_printer: SystemPrinter,
    paper_width: Option<String>,
) -> Result<Printer, String> {
    let conn = migrate::connection(&app);

    let chars = match paper_width.as_deref() {
        Some("58mm") => Some(32),
        _ => Some(48),
    };

    let now = chrono::Utc::now().to_rfc3339();

    let printer = Printer {
        id: format!("system-{}", chrono::Utc::now().timestamp_millis()),
        name: system_printer.name.clone(),
        printer_type: "system".to_string(),
        ip_address: None,
        port: None,
        bluetooth_address: None,
        paper_width: paper_width.or(Some("80mm".to_string())),
        chars_per_line: chars,
        is_active: true,
        print_templates: None,
        created_at: Some(now.clone()),
        updated_at: Some(now),
    };

    PrinterRepo::save(&conn, &printer).map_err(|e| format!("Failed to save printer: {}", e))?;

    Ok(printer)
}
