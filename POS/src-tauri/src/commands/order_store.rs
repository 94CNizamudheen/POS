use crate::order_store::{Order, OrderLineItem, SharedOrderStore, TerminalIdentity};
use tauri::{command, State};

/// Return all active (non-terminal) orders from the POS order store.
/// Use this on frontend restart to reconcile state without needing a WS reconnect.
#[command]
pub fn get_active_orders(
    store: State<'_, SharedOrderStore>,
) -> Result<Vec<Order>, String> {
    store
        .lock()
        .unwrap()
        .get_active_orders()
        .map_err(|e| e.to_string())
}

/// Return a single order by ID.
#[command]
pub fn get_order(
    store: State<'_, SharedOrderStore>,
    order_id: String,
) -> Result<Option<Order>, String> {
    store
        .lock()
        .unwrap()
        .get_order(&order_id)
        .map_err(|e| e.to_string())
}

/// Return all orders (active + completed), newest first, up to `limit` rows.
#[command]
pub fn get_all_orders(
    store: State<'_, SharedOrderStore>,
    limit: Option<u32>,
) -> Result<Vec<Order>, String> {
    store
        .lock()
        .unwrap()
        .get_all_orders(limit.unwrap_or(100))
        .map_err(|e| e.to_string())
}

/// Create a walk-up POS order and immediately mark it completed.
/// Used when a cashier rings up items directly at the POS without a KIOSK order.
#[command]
pub fn complete_pos_order(
    store: State<'_, SharedOrderStore>,
    items: Vec<OrderLineItem>,
    payment_method: String,
    terminal_id: String,
) -> Result<Order, String> {
    let origin = TerminalIdentity {
        terminal_id,
        terminal_type: "POS".to_string(),
    };
    let mut s = store.lock().unwrap();
    let order = s
        .create_order(items, &origin, "DRAFT", None)
        .map_err(|e| e.to_string())?;
    let completed = s
        .complete_order(&order.order_id, &payment_method)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Order not found after creation".to_string())?;
    Ok(completed)
}
