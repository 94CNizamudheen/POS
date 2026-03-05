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
                    "TRANSFERRED",
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

    // ── RELEASE_ORDER: clear owner, broadcast ────────────────────────────────
    {
        let ws_state = ws_state.clone();
        let order_store = order_store.clone();
        event_bus
            .subscribe("RELEASE_ORDER", move |msg| {
                let order_id = match msg.payload.get("orderId").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => return,
                };
                let result = order_store.lock().unwrap().release_order(&order_id);
                if let Ok(Some(order)) = result {
                    let terminals = ws_state.server.get_terminals();
                    let msg_updated =
                        WsMessage::new("ORDER_UPDATED", serde_json::json!({ "order": order }));
                    tokio::spawn(async move {
                        broadcast_all(&terminals, &msg_updated).await;
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

    log::info!("WebSocket routes registered");
}
