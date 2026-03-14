use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

// ── Struct ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KdsTicket {
    pub id: String,
    pub ticket_number: String,
    pub order_id: Option<String>,
    pub order_mode_name: Option<String>,
    pub status: String,
    pub items: String,
    pub total_amount: Option<i64>,
    pub token_number: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

// ── Repository ────────────────────────────────────────────────────────────────

/// Insert or replace a KDS ticket.
pub fn save_kds_ticket(conn: &Connection, ticket: &KdsTicket) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO kds_tickets
         (id, ticket_number, order_id, order_mode_name, status, items,
          total_amount, token_number, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            ticket.id,
            ticket.ticket_number,
            ticket.order_id,
            ticket.order_mode_name,
            ticket.status,
            ticket.items,
            ticket.total_amount,
            ticket.token_number,
            ticket.created_at,
            ticket.updated_at,
        ],
    )?;
    Ok(())
}

/// Fetch all tickets ordered by created_at ascending.
pub fn get_all_kds_tickets(conn: &Connection) -> Result<Vec<KdsTicket>> {
    let mut stmt = conn.prepare(
        "SELECT id, ticket_number, order_id, order_mode_name, status, items,
                total_amount, token_number, created_at, updated_at
         FROM kds_tickets
         ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map([], map_row)?;
    rows.collect()
}

/// Fetch only PENDING and IN_PROGRESS tickets.
pub fn get_active_kds_tickets(conn: &Connection) -> Result<Vec<KdsTicket>> {
    let mut stmt = conn.prepare(
        "SELECT id, ticket_number, order_id, order_mode_name, status, items,
                total_amount, token_number, created_at, updated_at
         FROM kds_tickets
         WHERE status != 'READY'
         ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map([], map_row)?;
    rows.collect()
}

/// Fetch tickets filtered by status.
pub fn get_kds_tickets_by_status(conn: &Connection, status: &str) -> Result<Vec<KdsTicket>> {
    let mut stmt = conn.prepare(
        "SELECT id, ticket_number, order_id, order_mode_name, status, items,
                total_amount, token_number, created_at, updated_at
         FROM kds_tickets
         WHERE status = ?1
         ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map(params![status], map_row)?;
    rows.collect()
}

/// Update the status of a ticket and refresh updated_at.
pub fn update_kds_ticket_status(conn: &Connection, ticket_id: &str, status: &str) -> Result<()> {
    conn.execute(
        "UPDATE kds_tickets
         SET status = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?2",
        params![status, ticket_id],
    )?;
    Ok(())
}

/// Delete a ticket by id.
pub fn delete_kds_ticket(conn: &Connection, ticket_id: &str) -> Result<()> {
    conn.execute("DELETE FROM kds_tickets WHERE id = ?1", params![ticket_id])?;
    Ok(())
}

// ── Helper ────────────────────────────────────────────────────────────────────

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<KdsTicket> {
    Ok(KdsTicket {
        id: row.get(0)?,
        ticket_number: row.get(1)?,
        order_id: row.get(2)?,
        order_mode_name: row.get(3)?,
        status: row.get(4)?,
        items: row.get(5)?,
        total_amount: row.get(6)?,
        token_number: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}
