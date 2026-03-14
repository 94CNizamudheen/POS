use tauri::AppHandle;
use crate::db::migrate;
use crate::db::models::queue_token::{self, QueueToken};

#[tauri::command]
pub fn save_queue_token(app: AppHandle, token: QueueToken) -> Result<(), String> {
    log::info!("save_queue_token: token_number={}", token.token_number);
    let conn = migrate::connection(&app);
    queue_token::save_queue_token(&conn, &token).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_active_queue_tokens(app: AppHandle) -> Result<Vec<QueueToken>, String> {
    let conn = migrate::connection(&app);
    queue_token::get_active_queue_tokens(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_queue_token_status(
    app: AppHandle,
    token_number: i64,
    status: String,
) -> Result<(), String> {
    log::info!("update_queue_token_status: {} → {}", token_number, status);
    let conn = migrate::connection(&app);
    queue_token::update_queue_token_status(&conn, token_number, &status)
        .map_err(|e| e.to_string())
}
