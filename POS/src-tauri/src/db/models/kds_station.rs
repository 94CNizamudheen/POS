use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

// ── Struct ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KdsStation {
    pub id: String,
    pub name: String,
    pub is_master: i64,
    pub group_ids: String,
    pub sort_order: i64,
    pub active: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

// ── Repository ────────────────────────────────────────────────────────────────

/// Fetch all active stations ordered by sort_order.
pub fn get_all_kds_stations(conn: &Connection) -> Result<Vec<KdsStation>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, is_master, group_ids, sort_order, active, created_at, updated_at
         FROM kds_stations
         WHERE active = 1
         ORDER BY sort_order ASC",
    )?;
    let rows = stmt.query_map([], map_row)?;
    rows.collect()
}

/// Insert or update a station (upsert by id).
pub fn upsert_kds_station(conn: &Connection, station: &KdsStation) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO kds_stations
         (id, name, is_master, group_ids, sort_order, active, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
        params![
            station.id,
            station.name,
            station.is_master,
            station.group_ids,
            station.sort_order,
            station.active,
        ],
    )?;
    Ok(())
}

/// Soft-delete a station (set active = 0).
pub fn delete_kds_station(conn: &Connection, id: &str) -> Result<()> {
    conn.execute(
        "UPDATE kds_stations SET active = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

// ── Helper ────────────────────────────────────────────────────────────────────

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<KdsStation> {
    Ok(KdsStation {
        id: row.get(0)?,
        name: row.get(1)?,
        is_master: row.get(2)?,
        group_ids: row.get(3)?,
        sort_order: row.get(4)?,
        active: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}
