use crate::order_store::{HeldOrder, Order, OrderLineItem, SharedOrderStore, TerminalIdentity};
use tauri::{command, State};

#[command]
pub fn get_active_orders(store: State<'_, SharedOrderStore>) -> Result<Vec<Order>, String> {
    store.lock().unwrap().get_active_orders().map_err(|e| e.to_string())
}

#[command]
pub fn get_order(
    store: State<'_, SharedOrderStore>,
    order_id: String,
) -> Result<Option<Order>, String> {
    store.lock().unwrap().get_order(&order_id).map_err(|e| e.to_string())
}

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

#[command]
pub fn save_held_order(
    store: State<'_, SharedOrderStore>,
    held: HeldOrder,
) -> Result<(), String> {
    store.lock().unwrap().save_held_order(&held).map_err(|e| e.to_string())
}

#[command]
pub fn get_all_held_orders(store: State<'_, SharedOrderStore>) -> Result<Vec<HeldOrder>, String> {
    store.lock().unwrap().get_all_held_orders().map_err(|e| e.to_string())
}

#[command]
pub fn delete_held_order(
    store: State<'_, SharedOrderStore>,
    order_id: String,
) -> Result<(), String> {
    store.lock().unwrap().delete_held_order(&order_id).map_err(|e| e.to_string())
}

/// Create a walk-up POS order and immediately mark it completed.
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
