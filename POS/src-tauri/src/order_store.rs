use rusqlite::{params, Connection, Error as SqlError, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

const ORDER_TTL_MS: i64 = 5 * 60 * 1000; // 5 minutes

// ── Types (camelCase to match TypeScript WsMessage payloads) ─────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalIdentity {
    #[serde(rename = "terminalId")]
    pub terminal_id: String,
    #[serde(rename = "type")]
    pub terminal_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderLineItem {
    #[serde(rename = "productId")]
    pub product_id: String,
    pub name: String,
    pub price: f64,
    pub qty: i64,
    pub subtotal: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    #[serde(rename = "orderId")]
    pub order_id: String,
    #[serde(rename = "orderNumber")]
    pub order_number: String,
    pub status: String,
    pub items: Vec<OrderLineItem>,
    pub subtotal: f64,
    pub tax: f64,
    pub total: f64,
    #[serde(rename = "originTerminal")]
    pub origin_terminal: TerminalIdentity,
    #[serde(rename = "ownerTerminal")]
    pub owner_terminal: Option<TerminalIdentity>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    #[serde(rename = "expiresAt")]
    pub expires_at: i64,
    pub notes: Option<String>,
}

// ── Store ────────────────────────────────────────────────────────────────────

pub struct OrderStore {
    conn: Connection,
    order_counter: u32,
}

impl OrderStore {
    pub fn new(db_path: &str) -> SqlResult<Self> {
        let conn = Connection::open(db_path)?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS orders (
                order_id TEXT PRIMARY KEY,
                order_number TEXT NOT NULL,
                status TEXT NOT NULL,
                items_json TEXT NOT NULL,
                subtotal REAL, tax REAL, total REAL,
                origin_terminal_id TEXT, origin_type TEXT,
                owner_terminal_id TEXT, owner_type TEXT,
                created_at INTEGER, updated_at INTEGER, expires_at INTEGER,
                completed_at INTEGER, payment_method TEXT, notes TEXT
            );
            CREATE TABLE IF NOT EXISTS held_orders (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL UNIQUE,
                order_number TEXT NOT NULL,
                order_json TEXT NOT NULL,
                total REAL NOT NULL DEFAULT 0,
                held_at INTEGER NOT NULL
            );",
        )?;
        Ok(Self { conn, order_counter: 0 })
    }

    // ── Held-order CRUD ───────────────────────────────────────────────────────

    pub fn save_held_order(&self, held: &HeldOrder) -> SqlResult<()> {
        self.conn.execute(
            "INSERT INTO held_orders (id, order_id, order_number, order_json, total, held_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(order_id) DO UPDATE SET
               order_json = excluded.order_json,
               total = excluded.total,
               held_at = excluded.held_at",
            params![held.id, held.order_id, held.order_number, held.order_json, held.total, held.held_at],
        )?;
        Ok(())
    }

    pub fn get_all_held_orders(&self) -> SqlResult<Vec<HeldOrder>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, order_id, order_number, order_json, total, held_at
             FROM held_orders ORDER BY held_at ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(HeldOrder {
                id: row.get(0)?,
                order_id: row.get(1)?,
                order_number: row.get(2)?,
                order_json: row.get(3)?,
                total: row.get(4)?,
                held_at: row.get(5)?,
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn delete_held_order(&self, order_id: &str) -> SqlResult<()> {
        self.conn.execute(
            "DELETE FROM held_orders WHERE order_id = ?1",
            params![order_id],
        )?;
        Ok(())
    }

    fn next_order_number(&mut self) -> String {
        self.order_counter = (self.order_counter + 1) % 1000;
        format!("A{:03}", self.order_counter)
    }

    fn row_to_order(row: &rusqlite::Row<'_>) -> rusqlite::Result<Order> {
        let items_json: String = row.get("items_json")?;
        let items: Vec<OrderLineItem> = serde_json::from_str(&items_json).unwrap_or_default();

        let owner_terminal_id: Option<String> = row.get("owner_terminal_id")?;
        let owner_terminal = if let Some(id) = owner_terminal_id {
            let owner_type: String = row.get("owner_type")?;
            Some(TerminalIdentity { terminal_id: id, terminal_type: owner_type })
        } else {
            None
        };

        Ok(Order {
            order_id: row.get("order_id")?,
            order_number: row.get("order_number")?,
            status: row.get("status")?,
            items,
            subtotal: row.get("subtotal")?,
            tax: row.get("tax")?,
            total: row.get("total")?,
            origin_terminal: TerminalIdentity {
                terminal_id: row.get("origin_terminal_id")?,
                terminal_type: row.get("origin_type")?,
            },
            owner_terminal,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            expires_at: row.get("expires_at")?,
            notes: row.get("notes")?,
        })
    }

    pub fn create_order(
        &mut self,
        items: Vec<OrderLineItem>,
        origin: &TerminalIdentity,
        status: &str,
        notes: Option<String>,
    ) -> SqlResult<Order> {
        let now = chrono::Utc::now().timestamp_millis();
        let order_id = uuid::Uuid::new_v4().to_string();
        let order_number = self.next_order_number();
        let subtotal: f64 = items.iter().map(|i| i.subtotal).sum();
        let tax = subtotal * 0.1;
        let total = subtotal + tax;
        let expires_at = now + ORDER_TTL_MS;
        let items_json = serde_json::to_string(&items).unwrap_or_default();

        self.conn.execute(
            "INSERT INTO orders (
                order_id, order_number, status, items_json,
                subtotal, tax, total,
                origin_terminal_id, origin_type,
                owner_terminal_id, owner_type,
                created_at, updated_at, expires_at, notes
            ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,NULL,NULL,?10,?11,?12,?13)",
            params![
                order_id, order_number, status, items_json,
                subtotal, tax, total,
                origin.terminal_id, origin.terminal_type,
                now, now, expires_at, notes,
            ],
        )?;

        Ok(Order {
            order_id,
            order_number,
            status: status.to_string(),
            items,
            subtotal,
            tax,
            total,
            origin_terminal: origin.clone(),
            owner_terminal: None,
            created_at: now,
            updated_at: now,
            expires_at,
            notes,
        })
    }

    pub fn claim_order(&self, order_id: &str, claimant: &TerminalIdentity) -> SqlResult<bool> {
        let now = chrono::Utc::now().timestamp_millis();
        let changes = self.conn.execute(
            "UPDATE orders SET owner_terminal_id=?1, owner_type=?2, status='IN_PROGRESS', updated_at=?3
             WHERE order_id=?4 AND owner_terminal_id IS NULL AND status='TRANSFERRED'",
            params![claimant.terminal_id, claimant.terminal_type, now, order_id],
        )?;
        Ok(changes > 0)
    }

    pub fn update_order(
        &self,
        order_id: &str,
        items: Vec<OrderLineItem>,
        updater: &TerminalIdentity,
    ) -> SqlResult<Option<Order>> {
        let order = match self.get_order(order_id)? {
            Some(o) => o,
            None => return Ok(None),
        };

        let is_owner = order
            .owner_terminal
            .as_ref()
            .map_or(false, |t| t.terminal_id == updater.terminal_id);
        let is_origin = order.origin_terminal.terminal_id == updater.terminal_id;
        if !is_owner && !is_origin {
            return Ok(None);
        }

        let now = chrono::Utc::now().timestamp_millis();
        let expires_at = now + ORDER_TTL_MS;
        let subtotal: f64 = items.iter().map(|i| i.subtotal).sum();
        let tax = subtotal * 0.1;
        let total = subtotal + tax;
        let items_json = serde_json::to_string(&items).unwrap_or_default();

        self.conn.execute(
            "UPDATE orders SET items_json=?1, subtotal=?2, tax=?3, total=?4, updated_at=?5, expires_at=?6
             WHERE order_id=?7",
            params![items_json, subtotal, tax, total, now, expires_at, order_id],
        )?;

        self.get_order(order_id)
    }

    pub fn accept_kiosk_order(&self, order_id: &str) -> SqlResult<Option<Order>> {
        let now = chrono::Utc::now().timestamp_millis();
        self.conn.execute(
            "UPDATE orders SET status='TRANSFERRED', updated_at=?1
             WHERE order_id=?2 AND status='PENDING_KIOSK'",
            params![now, order_id],
        )?;
        self.get_order(order_id)
    }

    pub fn delete_order(&self, order_id: &str) -> SqlResult<()> {
        self.conn.execute("DELETE FROM orders WHERE order_id=?1", params![order_id])?;
        Ok(())
    }

    pub fn release_order(&self, order_id: &str) -> SqlResult<Option<Order>> {
        let now = chrono::Utc::now().timestamp_millis();
        self.conn.execute(
            "UPDATE orders SET owner_terminal_id=NULL, owner_type=NULL, status='TRANSFERRED', updated_at=?1
             WHERE order_id=?2",
            params![now, order_id],
        )?;
        self.get_order(order_id)
    }

    pub fn complete_order(&self, order_id: &str, method: &str) -> SqlResult<Option<Order>> {
        let now = chrono::Utc::now().timestamp_millis();
        self.conn.execute(
            "UPDATE orders SET status='COMPLETED', completed_at=?1, payment_method=?2, updated_at=?3
             WHERE order_id=?4",
            params![now, method, now, order_id],
        )?;
        self.get_order(order_id)
    }

    /// Clears every user table in the database automatically.
    /// Queries sqlite_master to discover all tables — no hardcoded list needed.
    /// Any table added in the future is cleared automatically.
    pub fn clear_all_data(&self) -> SqlResult<()> {
        // Discover all user tables (excludes SQLite internal tables)
        let mut stmt = self.conn.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )?;
        let tables: Vec<String> = stmt
            .query_map([], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        self.conn.execute("PRAGMA foreign_keys = OFF", [])?;

        for table in &tables {
            match self.conn.execute(&format!("DELETE FROM {}", table), []) {
                Ok(n) => log::info!("Cleared {} rows from {}", n, table),
                Err(e) => log::warn!("Failed to clear {}: {}", table, e),
            }
        }

        self.conn.execute("PRAGMA foreign_keys = ON", [])?;

        log::info!("All data cleared ({} tables)", tables.len());
        Ok(())
    }

    pub fn expire_stale_orders(&self) -> SqlResult<Vec<(String, String)>> {
        let now = chrono::Utc::now().timestamp_millis();

        let expired: Vec<(String, String)> = {
            let mut stmt = self.conn.prepare(
                "SELECT order_id, order_number FROM orders
                 WHERE expires_at < ?1 AND status NOT IN ('COMPLETED', 'CANCELLED', 'EXPIRED')",
            )?;
            let rows: Vec<(String, String)> = stmt
                .query_map(params![now], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                })?
                .filter_map(|r| r.ok())
                .collect();
            rows
        };

        if !expired.is_empty() {
            self.conn.execute(
                "UPDATE orders SET status='EXPIRED', updated_at=?1
                 WHERE expires_at < ?2 AND status NOT IN ('COMPLETED', 'CANCELLED', 'EXPIRED')",
                params![now, now],
            )?;
        }

        Ok(expired)
    }

    pub fn get_active_orders(&self) -> SqlResult<Vec<Order>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM orders WHERE status NOT IN ('COMPLETED', 'CANCELLED', 'EXPIRED')",
        )?;
        let orders = stmt
            .query_map([], |row| Self::row_to_order(row))?
            .filter_map(|r| r.ok())
            .collect();
        Ok(orders)
    }

    pub fn get_all_orders(&self, limit: u32) -> SqlResult<Vec<Order>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM orders ORDER BY created_at DESC LIMIT ?1",
        )?;
        let orders = stmt
            .query_map(rusqlite::params![limit], |row| Self::row_to_order(row))?
            .filter_map(|r| r.ok())
            .collect();
        Ok(orders)
    }

    pub fn get_order(&self, order_id: &str) -> SqlResult<Option<Order>> {
        let mut stmt = self.conn.prepare("SELECT * FROM orders WHERE order_id = ?1")?;
        match stmt.query_row(params![order_id], |row| Self::row_to_order(row)) {
            Ok(order) => Ok(Some(order)),
            Err(SqlError::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

pub type SharedOrderStore = Arc<Mutex<OrderStore>>;

// ── Held Orders ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeldOrder {
    pub id: String,
    #[serde(rename = "orderId")]
    pub order_id: String,
    #[serde(rename = "orderNumber")]
    pub order_number: String,
    /// Full Order serialised as JSON — restored verbatim on resume
    #[serde(rename = "orderJson")]
    pub order_json: String,
    pub total: f64,
    #[serde(rename = "heldAt")]
    pub held_at: i64,
}
