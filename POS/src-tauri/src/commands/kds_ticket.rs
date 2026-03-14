use tauri::AppHandle;
use crate::db::migrate;
use crate::db::models::kds_ticket::{self, KdsTicket};

#[tauri::command]
pub fn save_kds_ticket(app: AppHandle, ticket: KdsTicket) -> Result<(), String> {
    log::info!("save_kds_ticket: {}", ticket.id);
    let conn = migrate::connection(&app);
    kds_ticket::save_kds_ticket(&conn, &ticket).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_kds_tickets(app: AppHandle) -> Result<Vec<KdsTicket>, String> {
    let conn = migrate::connection(&app);
    kds_ticket::get_all_kds_tickets(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_active_kds_tickets(app: AppHandle) -> Result<Vec<KdsTicket>, String> {
    let conn = migrate::connection(&app);
    kds_ticket::get_active_kds_tickets(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_kds_tickets_by_status(
    app: AppHandle,
    status: String,
) -> Result<Vec<KdsTicket>, String> {
    let conn = migrate::connection(&app);
    kds_ticket::get_kds_tickets_by_status(&conn, &status).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_kds_ticket_status(
    app: AppHandle,
    ticket_id: String,
    status: String,
) -> Result<(), String> {
    log::info!("update_kds_ticket_status: {} → {}", ticket_id, status);
    let conn = migrate::connection(&app);
    kds_ticket::update_kds_ticket_status(&conn, &ticket_id, &status).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_kds_ticket(app: AppHandle, ticket_id: String) -> Result<(), String> {
    log::info!("delete_kds_ticket: {}", ticket_id);
    let conn = migrate::connection(&app);
    kds_ticket::delete_kds_ticket(&conn, &ticket_id).map_err(|e| e.to_string())
}
