use crate::{db, AppDbPath};
use rusqlite::Connection;
use tauri::{command, AppHandle, State};

/// Get the full app state as a typed struct.
#[command]
pub fn get_app_state(app: AppHandle) -> Result<db::models::app_state::AppState, String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::get_app_state(&conn).map_err(|e| e.to_string())
}

// ── KDS ───────────────────────────────────────────────────────────────────────

#[command]
pub fn set_kds_ws_url(app: AppHandle, ws_url: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "kds_ws_url", &ws_url)
        .map_err(|e| e.to_string())
}

#[command]
pub fn set_kds_terminal_id(app: AppHandle, terminal_id: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "kds_terminal_id", &terminal_id)
        .map_err(|e| e.to_string())
}

#[command]
pub fn set_kds_display_settings(app: AppHandle, settings: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "kds_display_settings", &settings)
        .map_err(|e| e.to_string())
}

#[command]
pub fn set_kds_groups(app: AppHandle, groups: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "kds_groups", &groups)
        .map_err(|e| e.to_string())
}

// ── Queue Display ─────────────────────────────────────────────────────────────

#[command]
pub fn set_queue_ws_url(app: AppHandle, ws_url: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "queue_ws_url", &ws_url)
        .map_err(|e| e.to_string())
}

#[command]
pub fn set_queue_terminal_id(app: AppHandle, terminal_id: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "queue_terminal_id", &terminal_id)
        .map_err(|e| e.to_string())
}

// ── Customer Display ──────────────────────────────────────────────────────────

#[command]
pub fn set_cd_ws_url(app: AppHandle, ws_url: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "cd_ws_url", &ws_url)
        .map_err(|e| e.to_string())
}

#[command]
pub fn set_cd_terminal_id(app: AppHandle, terminal_id: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "cd_terminal_id", &terminal_id)
        .map_err(|e| e.to_string())
}

#[command]
pub fn set_cd_settings(app: AppHandle, settings: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "cd_settings", &settings)
        .map_err(|e| e.to_string())
}

// ── Kiosk ─────────────────────────────────────────────────────────────────────

#[command]
pub fn set_kiosk_pos_url(app: AppHandle, pos_url: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "kiosk_pos_url", &pos_url)
        .map_err(|e| e.to_string())
}

#[command]
pub fn set_kiosk_terminal_id(app: AppHandle, terminal_id: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "kiosk_terminal_id", &terminal_id)
        .map_err(|e| e.to_string())
}

#[command]
pub fn set_kiosk_position(app: AppHandle, position: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "kiosk_position", &position)
        .map_err(|e| e.to_string())
}

// ── Device ────────────────────────────────────────────────────────────────────

#[command]
pub fn set_device_role(app: AppHandle, role: String) -> Result<(), String> {
    let conn = db::connection(&app);
    db::models::app_state_repo::update_app_state(&conn, "device_role", &role)
        .map_err(|e| e.to_string())
}

// ── Data management ───────────────────────────────────────────────────────────

/// Clears every user table, then re-seeds the app_state row.
#[command]
pub fn clear_all_data(db_path: State<'_, AppDbPath>) -> Result<(), String> {
    let conn = Connection::open(&db_path.0).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .map_err(|e| e.to_string())?;

    let tables: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    conn.execute("PRAGMA foreign_keys = OFF", [])
        .map_err(|e| e.to_string())?;

    for table in &tables {
        match conn.execute(&format!("DELETE FROM {}", table), []) {
            Ok(n) => log::info!("Cleared {} rows from {}", n, table),
            Err(e) => log::warn!("Failed to clear {}: {}", table, e),
        }
    }

    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| e.to_string())?;

    // Re-seed the app_state single row
    conn.execute(
        "INSERT OR IGNORE INTO app_state (id, kiosk_position) VALUES (1, 'DISTANCE')",
        [],
    )
    .ok();

    log::info!("clear_all_data: cleared {} table(s)", tables.len());
    Ok(())
}
