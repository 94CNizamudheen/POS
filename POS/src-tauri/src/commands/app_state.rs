use crate::AppDbPath;
use rusqlite::Connection;
use tauri::{command, State};

/// Clears every user table in the database automatically.
///
/// Opens its own connection using the shared DB path — completely independent
/// from any module (orders, printer, etc.). Uses sqlite_master to discover
/// all tables at runtime, so any table added in the future is cleared
/// automatically with zero code changes.
#[command]
pub fn clear_all_data(db_path: State<'_, AppDbPath>) -> Result<(), String> {
    let conn = Connection::open(&db_path.0).map_err(|e| e.to_string())?;

    // Discover every user table — sqlite_master holds ALL tables in this DB file
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

    log::info!("clear_all_data: cleared {} table(s)", tables.len());
    Ok(())
}
