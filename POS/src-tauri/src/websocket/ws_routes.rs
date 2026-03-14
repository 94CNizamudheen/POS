use std::sync::Arc;

use crate::order_store::{OrderLineItem, SharedOrderStore, TerminalIdentity};
use super::{
    broadcast_all, broadcast_to_terminal_type, send_to_terminal, WsMessage, WsState,
};
use super::event_bus::EventBus;

pub async fn register_ws_routes(
    event_bus: Arc<EventBus>,
    ws_state: Arc<WsState>,
    order_store: SharedOrderStore,
) {
    log::info!("Registering WebSocket routes...");

    // ── REQUEST_ASSISTANCE: KIOSK → create order, notify all POS ────────────
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("REQUEST_ASSISTANCE", move |msg| {
                let sender_id = match msg.sender_id.clone() {
                    Some(id) => id,
                    None => return,
                };
                let sender_type =
                    msg.sender_type.clone().unwrap_or_else(|| "KIOSK".to_string());

                let items: Vec<OrderLineItem> = serde_json::from_value(
                    msg.payload.get("items").cloned().unwrap_or_default(),
                )
                .unwrap_or_default();

                let notes: Option<String> = msg
                    .payload
                    .get("notes")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let origin = TerminalIdentity {
                    terminal_id: sender_id.clone(),
                    terminal_type: sender_type,
                };

                let order = match order_store.lock().unwrap().create_order(
                    items,
                    &origin,
                    "TRANSFERRED",
                    notes,
                ) {
                    Ok(o) => o,
                    Err(e) => {
                        log::error!("create_order failed: {}", e);
                        return;
                    }
                };

                let terminals = ws_state.server.get_terminals();
                let msg_available =
                    WsMessage::new("ORDER_AVAILABLE", serde_json::json!({ "order": order }));

                tokio::spawn(async move {
                    send_to_terminal(&terminals, &sender_id, &msg_available).await;
                    broadcast_to_terminal_type(&terminals, "POS", &msg_available).await;
                    broadcast_to_terminal_type(&terminals, "KDS", &msg_available).await;
                    broadcast_to_terminal_type(&terminals, "QUEUE", &msg_available).await;
                    log::info!("REQUEST_ASSISTANCE → ORDER_AVAILABLE broadcast");
                });
            })
            .await;
    }

    // ── CLAIM_ORDER: POS → atomic claim ─────────────────────────────────────
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("CLAIM_ORDER", move |msg| {
                let sender_id = match msg.sender_id.clone() {
                    Some(id) => id,
                    None => return,
                };
                let sender_type = msg.sender_type.clone().unwrap_or_else(|| "POS".to_string());

                let order_id = match msg.payload.get("orderId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };

                let claimant = TerminalIdentity {
                    terminal_id: sender_id.clone(),
                    terminal_type: sender_type,
                };

                let store = order_store.lock().unwrap();
                let success = match store.claim_order(&order_id, &claimant) {
                    Ok(s) => s,
                    Err(e) => {
                        log::error!("claim_order failed: {}", e);
                        return;
                    }
                };

                if success {
                    let order = store.get_order(&order_id).ok().flatten();
                    drop(store);

                    if let Some(order) = order {
                        let origin_id = order.origin_terminal.terminal_id.clone();
                        let terminals = ws_state.server.get_terminals();
                        let ack =
                            WsMessage::new("CLAIM_ACK", serde_json::json!({ "order": order }));
                        let updated = WsMessage::new(
                            "ORDER_UPDATED",
                            serde_json::json!({ "order": order }),
                        );
                        tokio::spawn(async move {
                            send_to_terminal(&terminals, &sender_id, &ack).await;
                            send_to_terminal(&terminals, &origin_id, &updated).await;
                            log::info!("CLAIM_ORDER claimed by {}", sender_id);
                        });
                    }
                } else {
                    drop(store);
                    let terminals = ws_state.server.get_terminals();
                    let rejected = WsMessage::new(
                        "CLAIM_REJECTED",
                        serde_json::json!({
                            "orderId": order_id,
                            "reason": "Already claimed or unavailable"
                        }),
                    );
                    tokio::spawn(async move {
                        send_to_terminal(&terminals, &sender_id, &rejected).await;
                    });
                }
            })
            .await;
    }

    // ── SEND_TO_KIOSK: POS → assign order to KIOSK ──────────────────────────
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("SEND_TO_KIOSK", move |msg| {
                let sender_id = match msg.sender_id.clone() {
                    Some(id) => id,
                    None => return,
                };
                let sender_type = msg.sender_type.clone().unwrap_or_else(|| "POS".to_string());

                let items: Vec<OrderLineItem> = serde_json::from_value(
                    msg.payload.get("items").cloned().unwrap_or_default(),
                )
                .unwrap_or_default();
                let target_kiosk_id: Option<String> = msg
                    .payload
                    .get("targetKioskId")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                let notes: Option<String> = msg
                    .payload
                    .get("notes")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let origin = TerminalIdentity {
                    terminal_id: sender_id.clone(),
                    terminal_type: sender_type,
                };

                let order = match order_store.lock().unwrap().create_order(
                    items,
                    &origin,
                    "PENDING_KIOSK",
                    notes,
                ) {
                    Ok(o) => o,
                    Err(e) => {
                        log::error!("create_order (send_to_kiosk) failed: {}", e);
                        return;
                    }
                };

                let terminals = ws_state.server.get_terminals();
                let assigned =
                    WsMessage::new("ORDER_ASSIGNED", serde_json::json!({ "order": order }));
                let confirmed =
                    WsMessage::new("ORDER_UPDATED", serde_json::json!({ "order": order }));

                tokio::spawn(async move {
                    if let Some(kiosk_id) = target_kiosk_id {
                        send_to_terminal(&terminals, &kiosk_id, &assigned).await;
                    } else {
                        broadcast_to_terminal_type(&terminals, "KIOSK", &assigned).await;
                    }
                    send_to_terminal(&terminals, &sender_id, &confirmed).await;
                    log::info!("SEND_TO_KIOSK from {}", sender_id);
                });
            })
            .await;
    }

    // ── UPDATE_ORDER: validate ownership, update, notify both terminals ──────
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("UPDATE_ORDER", move |msg| {
                let sender_id = match msg.sender_id.clone() {
                    Some(id) => id,
                    None => return,
                };
                let sender_type = msg.sender_type.clone().unwrap_or_else(|| "POS".to_string());

                let order_id = match msg.payload.get("orderId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };
                let items: Vec<OrderLineItem> = serde_json::from_value(
                    msg.payload.get("items").cloned().unwrap_or_default(),
                )
                .unwrap_or_default();

                let updater = TerminalIdentity {
                    terminal_id: sender_id.clone(),
                    terminal_type: sender_type,
                };

                let result = order_store
                    .lock()
                    .unwrap()
                    .update_order(&order_id, items, &updater);

                match result {
                    Ok(Some(updated)) => {
                        let origin_id = updated.origin_terminal.terminal_id.clone();
                        let owner_id =
                            updated.owner_terminal.as_ref().map(|t| t.terminal_id.clone());
                        let terminals = ws_state.server.get_terminals();
                        let msg_updated = WsMessage::new(
                            "ORDER_UPDATED",
                            serde_json::json!({ "order": updated }),
                        );
                        tokio::spawn(async move {
                            send_to_terminal(&terminals, &origin_id, &msg_updated).await;
                            if let Some(owner) = owner_id {
                                if owner != origin_id {
                                    send_to_terminal(&terminals, &owner, &msg_updated).await;
                                }
                            }
                        });
                    }
                    Ok(None) => {
                        let terminals = ws_state.server.get_terminals();
                        let err = WsMessage::new(
                            "ERROR",
                            serde_json::json!({
                                "message": "Update failed: not owner or not found"
                            }),
                        );
                        tokio::spawn(async move {
                            send_to_terminal(&terminals, &sender_id, &err).await;
                        });
                    }
                    Err(e) => log::error!("update_order failed: {}", e),
                }
            })
            .await;
    }

    // ── ADD_ITEM: add or increment item in shared order ──────────────────────
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("ADD_ITEM", move |msg| {
                let sender_id = match msg.sender_id.clone() {
                    Some(id) => id,
                    None => return,
                };
                let sender_type = msg.sender_type.clone().unwrap_or_else(|| "POS".to_string());
                let order_id = match msg.payload.get("orderId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };
                let item: OrderLineItem = match serde_json::from_value(
                    msg.payload.get("item").cloned().unwrap_or_default(),
                ) {
                    Ok(i) => i,
                    Err(_) => return,
                };
                let updater = TerminalIdentity { terminal_id: sender_id, terminal_type: sender_type };
                let result = order_store.lock().unwrap().add_item(&order_id, item, &updater);
                if let Ok(Some(updated)) = result {
                    let origin_id = updated.origin_terminal.terminal_id.clone();
                    let owner_id = updated.owner_terminal.as_ref().map(|t| t.terminal_id.clone());
                    let terminals = ws_state.server.get_terminals();
                    let msg_updated = WsMessage::new("ORDER_UPDATED", serde_json::json!({ "order": updated }));
                    tokio::spawn(async move {
                        send_to_terminal(&terminals, &origin_id, &msg_updated).await;
                        if let Some(owner) = owner_id {
                            if owner != origin_id {
                                send_to_terminal(&terminals, &owner, &msg_updated).await;
                            }
                        }
                    });
                }
            })
            .await;
    }

    // ── REMOVE_ITEM: remove item from shared order ────────────────────────────
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("REMOVE_ITEM", move |msg| {
                let sender_id = match msg.sender_id.clone() {
                    Some(id) => id,
                    None => return,
                };
                let sender_type = msg.sender_type.clone().unwrap_or_else(|| "POS".to_string());
                let order_id = match msg.payload.get("orderId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };
                let product_id = match msg.payload.get("productId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };
                let updater = TerminalIdentity { terminal_id: sender_id, terminal_type: sender_type };
                let result = order_store.lock().unwrap().remove_item(&order_id, &product_id, &updater);
                if let Ok(Some(updated)) = result {
                    let origin_id = updated.origin_terminal.terminal_id.clone();
                    let owner_id = updated.owner_terminal.as_ref().map(|t| t.terminal_id.clone());
                    let terminals = ws_state.server.get_terminals();
                    let msg_updated = WsMessage::new("ORDER_UPDATED", serde_json::json!({ "order": updated }));
                    tokio::spawn(async move {
                        send_to_terminal(&terminals, &origin_id, &msg_updated).await;
                        if let Some(owner) = owner_id {
                            if owner != origin_id {
                                send_to_terminal(&terminals, &owner, &msg_updated).await;
                            }
                        }
                    });
                }
            })
            .await;
    }

    // ── CHANGE_QTY: set item quantity in shared order ─────────────────────────
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("CHANGE_QTY", move |msg| {
                let sender_id = match msg.sender_id.clone() {
                    Some(id) => id,
                    None => return,
                };
                let sender_type = msg.sender_type.clone().unwrap_or_else(|| "POS".to_string());
                let order_id = match msg.payload.get("orderId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };
                let product_id = match msg.payload.get("productId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };
                let qty = match msg.payload.get("qty").and_then(|v| v.as_i64()) {
                    Some(q) => q,
                    None => return,
                };
                let updater = TerminalIdentity { terminal_id: sender_id, terminal_type: sender_type };
                let result = order_store.lock().unwrap().change_qty(&order_id, &product_id, qty, &updater);
                if let Ok(Some(updated)) = result {
                    let origin_id = updated.origin_terminal.terminal_id.clone();
                    let owner_id = updated.owner_terminal.as_ref().map(|t| t.terminal_id.clone());
                    let terminals = ws_state.server.get_terminals();
                    let msg_updated = WsMessage::new("ORDER_UPDATED", serde_json::json!({ "order": updated }));
                    tokio::spawn(async move {
                        send_to_terminal(&terminals, &origin_id, &msg_updated).await;
                        if let Some(owner) = owner_id {
                            if owner != origin_id {
                                send_to_terminal(&terminals, &owner, &msg_updated).await;
                            }
                        }
                    });
                }
            })
            .await;
    }

    // ── APPLY_DISCOUNT: apply fixed discount to shared order ──────────────────
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("APPLY_DISCOUNT", move |msg| {
                let sender_id = match msg.sender_id.clone() {
                    Some(id) => id,
                    None => return,
                };
                let sender_type = msg.sender_type.clone().unwrap_or_else(|| "POS".to_string());
                let order_id = match msg.payload.get("orderId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };
                let amount = match msg.payload.get("amount").and_then(|v| v.as_f64()) {
                    Some(a) => a,
                    None => return,
                };
                let updater = TerminalIdentity { terminal_id: sender_id, terminal_type: sender_type };
                let result = order_store.lock().unwrap().apply_discount(&order_id, amount, &updater);
                if let Ok(Some(updated)) = result {
                    let origin_id = updated.origin_terminal.terminal_id.clone();
                    let owner_id = updated.owner_terminal.as_ref().map(|t| t.terminal_id.clone());
                    let terminals = ws_state.server.get_terminals();
                    let msg_updated = WsMessage::new("ORDER_UPDATED", serde_json::json!({ "order": updated }));
                    tokio::spawn(async move {
                        send_to_terminal(&terminals, &origin_id, &msg_updated).await;
                        if let Some(owner) = owner_id {
                            if owner != origin_id {
                                send_to_terminal(&terminals, &owner, &msg_updated).await;
                            }
                        }
                    });
                }
            })
            .await;
    }

    // ── RELEASE_ORDER: clear owner, broadcast ────────────────────────────────
    // If POS cancels before the KIOSK accepts (PENDING_KIOSK), delete the order
    // and broadcast ORDER_CANCELLED so the KIOSK dismisses the banner.
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("RELEASE_ORDER", move |msg| {
                let order_id = match msg.payload.get("orderId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };

                let store = order_store.lock().unwrap();
                let current = store.get_order(&order_id).ok().flatten();

                if current.as_ref().map_or(false, |o| o.status == "PENDING_KIOSK") {
                    // POS recalled before KIOSK acted — remove the order entirely
                    let _ = store.delete_order(&order_id);
                    drop(store);
                    let terminals = ws_state.server.get_terminals();
                    let msg_cancelled = WsMessage::new(
                        "ORDER_CANCELLED",
                        serde_json::json!({ "orderId": order_id }),
                    );
                    tokio::spawn(async move {
                        broadcast_all(&terminals, &msg_cancelled).await;
                        log::info!("RELEASE_ORDER (PENDING_KIOSK) → deleted + ORDER_CANCELLED");
                    });
                } else {
                    let result = store.release_order(&order_id);
                    drop(store);
                    if let Ok(Some(order)) = result {
                        let terminals = ws_state.server.get_terminals();
                        let msg_updated =
                            WsMessage::new("ORDER_UPDATED", serde_json::json!({ "order": order }));
                        tokio::spawn(async move {
                            broadcast_all(&terminals, &msg_updated).await;
                        });
                    }
                }
            })
            .await;
    }

    // ── KIOSK_ACCEPTED: KIOSK customer accepted the POS-sent order ───────────
    // Transitions the order from PENDING_KIOSK → TRANSFERRED, signals POS to
    // clear its KioskSentBanner.
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("KIOSK_ACCEPTED", move |msg| {
                let order_id = match msg.payload.get("orderId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };

                let result = order_store.lock().unwrap().accept_kiosk_order(&order_id);
                if let Ok(Some(order)) = result {
                    let origin_id = order.origin_terminal.terminal_id.clone();
                    let terminals = ws_state.server.get_terminals();
                    let msg_updated =
                        WsMessage::new("ORDER_UPDATED", serde_json::json!({ "order": order }));
                    tokio::spawn(async move {
                        // Notify the originating POS to clear its banner
                        send_to_terminal(&terminals, &origin_id, &msg_updated).await;
                        log::info!("KIOSK_ACCEPTED → ORDER_UPDATED sent to POS {}", origin_id);
                    });
                }
            })
            .await;
    }

    // ── COMPLETE_ORDER: mark completed, broadcast ────────────────────────────
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("COMPLETE_ORDER", move |msg| {
                let order_id = match msg.payload.get("orderId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };
                let method = msg
                    .payload
                    .get("method")
                    .and_then(|v| v.as_str())
                    .unwrap_or("CASH")
                    .to_string();

                let result = order_store.lock().unwrap().complete_order(&order_id, &method);
                if let Ok(Some(order)) = result {
                    let terminals = ws_state.server.get_terminals();
                    let msg_completed =
                        WsMessage::new("ORDER_COMPLETED", serde_json::json!({ "order": order }));
                    tokio::spawn(async move {
                        broadcast_all(&terminals, &msg_completed).await;
                    });
                }
            })
            .await;
    }

    // ── KIOSK_COMPLETE_ORDER: KIOSK customer paid — save to POS DB ──────────
    // Self-service: creates a new order with origin=KIOSK then completes it.
    // POS→KIOSK flow: completes the existing order by orderId.
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("KIOSK_COMPLETE_ORDER", move |msg| {
                let sender_id = match msg.sender_id.clone() {
                    Some(id) => id,
                    None => return,
                };
                let sender_type =
                    msg.sender_type.clone().unwrap_or_else(|| "KIOSK".to_string());

                let order_id: Option<String> = msg
                    .payload
                    .get("orderId")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                let method = msg
                    .payload
                    .get("method")
                    .and_then(|v| v.as_str())
                    .unwrap_or("CASH")
                    .to_string();
                let items: Vec<OrderLineItem> = serde_json::from_value(
                    msg.payload.get("items").cloned().unwrap_or_default(),
                )
                .unwrap_or_default();

                let mut store = order_store.lock().unwrap();

                let completed = if let Some(id) = order_id {
                    // POS→KIOSK accepted flow — complete the existing order
                    store.complete_order(&id, &method).ok().flatten()
                } else {
                    // Pure KIOSK self-service — create then immediately complete
                    let origin = TerminalIdentity {
                        terminal_id: sender_id.clone(),
                        terminal_type: sender_type,
                    };
                    match store.create_order(items, &origin, "COMPLETED", None) {
                        Ok(order) => store
                            .complete_order(&order.order_id, &method)
                            .ok()
                            .flatten(),
                        Err(e) => {
                            log::error!("KIOSK_COMPLETE_ORDER create failed: {}", e);
                            None
                        }
                    }
                };

                drop(store);

                if let Some(order) = completed {
                    let terminals = ws_state.server.get_terminals();
                    let msg_completed = WsMessage::new(
                        "ORDER_COMPLETED",
                        serde_json::json!({ "order": order }),
                    );
                    tokio::spawn(async move {
                        broadcast_all(&terminals, &msg_completed).await;
                        log::info!("KIOSK_COMPLETE_ORDER from {} → ORDER_COMPLETED", sender_id);
                    });
                }
            })
            .await;
    }

    // ── PULL_KIOSK_CART: POS → forward to target KIOSK (side-by-side pull) ────
    {
        let ws_state = ws_state.clone();
        event_bus
            .subscribe("PULL_KIOSK_CART", move |msg| {
                let target_kiosk_id = match msg
                    .payload
                    .get("targetKioskId")
                    .and_then(|v| v.as_str())
                {
                    Some(id) => id.to_string(),
                    None => return,
                };
                let terminals = ws_state.server.get_terminals();
                let forward = WsMessage::new("PULL_KIOSK_CART", msg.payload.clone());
                tokio::spawn(async move {
                    send_to_terminal(&terminals, &target_kiosk_id, &forward).await;
                    log::info!("PULL_KIOSK_CART forwarded to {}", target_kiosk_id);
                });
            })
            .await;
    }

    // ── queue_call: POS → broadcast to all QUEUE terminals ───────────────────
    {
        let ws_state = ws_state.clone();
        event_bus
            .subscribe("queue_call", move |msg| {
                let terminals = ws_state.server.get_terminals();
                let forward = WsMessage::new("queue_call", msg.payload.clone());
                tokio::spawn(async move {
                    broadcast_to_terminal_type(&terminals, "QUEUE", &forward).await;
                    log::info!("queue_call broadcast to QUEUE terminals");
                });
            })
            .await;
    }

    // ── queue_served: POS → broadcast to all QUEUE terminals ─────────────────
    {
        let ws_state = ws_state.clone();
        event_bus
            .subscribe("queue_served", move |msg| {
                let terminals = ws_state.server.get_terminals();
                let forward = WsMessage::new("queue_served", msg.payload.clone());
                tokio::spawn(async move {
                    broadcast_to_terminal_type(&terminals, "QUEUE", &forward).await;
                    log::info!("queue_served broadcast to QUEUE terminals");
                });
            })
            .await;
    }

    // ── workday_started: POS → broadcast to QUEUE + KDS terminals ────────────
    {
        let ws_state = ws_state.clone();
        event_bus
            .subscribe("workday_started", move |msg| {
                let terminals = ws_state.server.get_terminals();
                let forward = WsMessage::new("workday_started", msg.payload.clone());
                tokio::spawn(async move {
                    broadcast_to_terminal_type(&terminals, "QUEUE", &forward).await;
                    broadcast_to_terminal_type(&terminals, "KDS", &forward).await;
                    log::info!("workday_started broadcast to QUEUE + KDS");
                });
            })
            .await;
    }

    // ── workday_ended: POS → broadcast to QUEUE + KDS terminals ──────────────
    {
        let ws_state = ws_state.clone();
        event_bus
            .subscribe("workday_ended", move |msg| {
                let terminals = ws_state.server.get_terminals();
                let forward = WsMessage::new("workday_ended", msg.payload.clone());
                tokio::spawn(async move {
                    broadcast_to_terminal_type(&terminals, "QUEUE", &forward).await;
                    broadcast_to_terminal_type(&terminals, "KDS", &forward).await;
                    log::info!("workday_ended broadcast to QUEUE + KDS");
                });
            })
            .await;
    }

    // ── CLEAR_KIOSK_DATA: POS → forward to target KIOSK or all KIOSKs ────────
    {
        let ws_state = ws_state.clone();
        event_bus
            .subscribe("CLEAR_KIOSK_DATA", move |msg| {
                let target_kiosk_id: Option<String> = msg
                    .payload
                    .get("targetKioskId")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                let terminals = ws_state.server.get_terminals();
                let forward = WsMessage::new("CLEAR_KIOSK_DATA", msg.payload.clone());
                tokio::spawn(async move {
                    if let Some(kiosk_id) = target_kiosk_id {
                        send_to_terminal(&terminals, &kiosk_id, &forward).await;
                        log::info!("CLEAR_KIOSK_DATA forwarded to {}", kiosk_id);
                    } else {
                        broadcast_to_terminal_type(&terminals, "KIOSK", &forward).await;
                        log::info!("CLEAR_KIOSK_DATA broadcast to all KIOSKs");
                    }
                });
            })
            .await;
    }

    log::info!("WebSocket routes registered");
}
