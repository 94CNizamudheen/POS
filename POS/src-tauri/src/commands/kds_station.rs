use tauri::AppHandle;
use crate::db::migrate;
use crate::db::models::kds_station::{self, KdsStation};

#[tauri::command]
pub fn get_kds_stations(app: AppHandle) -> Result<Vec<KdsStation>, String> {
    let conn = migrate::connection(&app);
    kds_station::get_all_kds_stations(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_kds_station(app: AppHandle, station: KdsStation) -> Result<(), String> {
    log::info!("save_kds_station: {}", station.id);
    let conn = migrate::connection(&app);
    kds_station::upsert_kds_station(&conn, &station).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_kds_station(app: AppHandle, id: String) -> Result<(), String> {
    log::info!("delete_kds_station: {}", id);
    let conn = migrate::connection(&app);
    kds_station::delete_kds_station(&conn, &id).map_err(|e| e.to_string())
}

/// Get the station ID this device is assigned to (stored in app_state key-value).
/// Returns an empty string when no station is selected (master mode / show all).
#[tauri::command]
pub fn get_kds_station_id(app: AppHandle) -> Result<String, String> {
    let conn = migrate::connection(&app);
    let mut stmt = conn
        .prepare("SELECT value FROM app_state WHERE key = 'kds_station_id'")
        .map_err(|e| e.to_string())?;
    let result: rusqlite::Result<String> = stmt.query_row([], |row| row.get(0));
    match result {
        Ok(v) => Ok(v),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(String::new()),
        Err(e) => Err(e.to_string()),
    }
}

/// Assign this device to a KDS station (or clear with empty string).
#[tauri::command]
pub fn set_kds_station_id(app: AppHandle, station_id: String) -> Result<(), String> {
    let conn = migrate::connection(&app);
    conn.execute(
        "INSERT OR REPLACE INTO app_state (key, value) VALUES ('kds_station_id', ?1)",
        rusqlite::params![station_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
