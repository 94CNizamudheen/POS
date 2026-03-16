use rusqlite::{params, Connection};
use super::app_state::AppState;

pub fn get_app_state(conn: &Connection) -> rusqlite::Result<AppState> {
    match conn.query_row(
        r#"
        SELECT kds_ws_url,
               kds_terminal_id,
               kds_display_settings,
               kds_groups,
               queue_ws_url,
               queue_terminal_id,
               cd_ws_url,
               cd_terminal_id,
               cd_settings,
               kiosk_pos_url,
               kiosk_terminal_id,
               kiosk_position,
               device_role
        FROM app_state
        WHERE id = 1
        "#,
        [],
        |row| {
            Ok(AppState {
                kds_ws_url: row.get(0)?,
                kds_terminal_id: row.get(1)?,
                kds_display_settings: row.get(2)?,
                kds_groups: row.get(3)?,
                queue_ws_url: row.get(4)?,
                queue_terminal_id: row.get(5)?,
                cd_ws_url: row.get(6)?,
                cd_terminal_id: row.get(7)?,
                cd_settings: row.get(8)?,
                kiosk_pos_url: row.get(9)?,
                kiosk_terminal_id: row.get(10)?,
                kiosk_position: row.get(11)?,
                device_role: row.get(12)?,
            })
        },
    ) {
        Ok(state) => Ok(state),

        Err(rusqlite::Error::QueryReturnedNoRows) => {
            // Seed the single row if it doesn't exist yet
            conn.execute(
                "INSERT INTO app_state (id, kiosk_position) VALUES (1, 'DISTANCE')",
                [],
            )?;
            Ok(AppState {
                kds_ws_url: None,
                kds_terminal_id: None,
                kds_display_settings: Some("{}".to_string()),
                kds_groups: Some("[]".to_string()),
                queue_ws_url: None,
                queue_terminal_id: None,
                cd_ws_url: None,
                cd_terminal_id: None,
                cd_settings: Some("{}".to_string()),
                kiosk_pos_url: None,
                kiosk_terminal_id: None,
                kiosk_position: Some("DISTANCE".to_string()),
                device_role: None,
            })
        }

        Err(e) => Err(e),
    }
}

/// Update a single named column on the always-present row (id = 1).
pub fn update_app_state(conn: &Connection, field: &str, value: &str) -> rusqlite::Result<()> {
    let sql = format!(
        "UPDATE app_state SET {} = ?, updated_at = strftime('%s', 'now') WHERE id = 1",
        field
    );
    conn.execute(&sql, params![value])?;
    Ok(())
}
