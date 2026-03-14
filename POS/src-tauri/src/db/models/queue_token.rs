use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

// ── Struct ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QueueToken {
    pub id: String,
    pub ticket_id: Option<String>,
    pub ticket_number: Option<String>,
    pub token_number: i64,
    pub status: String,
    pub source: Option<String>,
    pub order_mode: Option<String>,
    pub created_at: String,
    pub called_at: Option<String>,
    pub served_at: Option<String>,
}

// ── Repository ────────────────────────────────────────────────────────────────

/// Insert or replace a queue token.
pub fn save_queue_token(conn: &Connection, token: &QueueToken) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO queue_tokens
         (id, ticket_id, ticket_number, token_number, status, source,
          order_mode, created_at, called_at, served_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            token.id,
            token.ticket_id,
            token.ticket_number,
            token.token_number,
            token.status,
            token.source,
            token.order_mode,
            token.created_at,
            token.called_at,
            token.served_at,
        ],
    )?;
    Ok(())
}

/// Fetch all tokens that are WAITING or CALLED (active).
pub fn get_active_queue_tokens(conn: &Connection) -> Result<Vec<QueueToken>> {
    let mut stmt = conn.prepare(
        "SELECT id, ticket_id, ticket_number, token_number, status, source,
                order_mode, created_at, called_at, served_at
         FROM queue_tokens
         WHERE status IN ('WAITING', 'CALLED')
         ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map([], map_row)?;
    rows.collect()
}

/// Update the status of a token by token_number and refresh the relevant timestamp.
pub fn update_queue_token_status(
    conn: &Connection,
    token_number: i64,
    status: &str,
) -> Result<()> {
    match status {
        "CALLED" => {
            conn.execute(
                "UPDATE queue_tokens
                 SET status = ?1, called_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE token_number = ?2",
                params![status, token_number],
            )?;
        }
        "SERVED" => {
            conn.execute(
                "UPDATE queue_tokens
                 SET status = ?1, served_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE token_number = ?2",
                params![status, token_number],
            )?;
        }
        _ => {
            conn.execute(
                "UPDATE queue_tokens SET status = ?1 WHERE token_number = ?2",
                params![status, token_number],
            )?;
        }
    }
    Ok(())
}

// ── Helper ────────────────────────────────────────────────────────────────────

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<QueueToken> {
    Ok(QueueToken {
        id: row.get(0)?,
        ticket_id: row.get(1)?,
        ticket_number: row.get(2)?,
        token_number: row.get(3)?,
        status: row.get(4)?,
        source: row.get(5)?,
        order_mode: row.get(6)?,
        created_at: row.get(7)?,
        called_at: row.get(8)?,
        served_at: row.get(9)?,
    })
}
