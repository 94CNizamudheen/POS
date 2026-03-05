mod commands;
mod order_store;
mod websocket;

use std::sync::{Arc, Mutex};
use tauri::Manager;
use tokio::sync::mpsc;
use websocket::{EventBusState, WebSocketServer, WsState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // ── Order store (SQLite) ──────────────────────────────────────────
            let db_path = app
                .path()
                .app_data_dir()
                .map(|p| {
                    std::fs::create_dir_all(&p).ok();
                    p.join("orders.db").to_string_lossy().to_string()
                })
                .unwrap_or_else(|_| "./orders.db".to_string());

            let order_store = Arc::new(Mutex::new(
                order_store::OrderStore::new(&db_path)
                    .expect("Failed to initialise order store"),
            ));

            // ── WebSocket server (primary POS only) ───────────────────────────
            let (event_tx, event_rx) = mpsc::unbounded_channel();

            let event_bus = websocket::event_bus::EventBus::new(event_rx);
            let event_bus_clone = event_bus.clone();

            let ws_server = Arc::new(WebSocketServer::new(event_tx, order_store.clone()));

            let ws_state = WsState {
                server: ws_server.clone(),
            };

            app.manage(ws_state.clone());
            app.manage(EventBusState { bus: event_bus.clone() });
            app.manage(order_store.clone());

            // Register order routes
            let event_bus_arc = Arc::new(event_bus.clone());
            let ws_state_arc = Arc::new(ws_state.clone());
            let order_store_for_routes = order_store.clone();
            tauri::async_runtime::spawn(async move {
                websocket::ws_routes::register_ws_routes(
                    event_bus_arc,
                    ws_state_arc,
                    order_store_for_routes,
                )
                .await;
            });

            // Start EventBus
            tauri::async_runtime::spawn(async move {
                event_bus_clone.start().await;
            });

            // Start WS server — always on, listens on all interfaces port 3001
            let ws_addr = "0.0.0.0:3001";
            log::info!("Starting WebSocket server on {}", ws_addr);
            tauri::async_runtime::spawn(async move {
                match ws_server.start(ws_addr).await {
                    Ok(_) => log::info!("WebSocket server started"),
                    Err(e) => log::error!("WebSocket server failed: {}", e),
                }
            });

            // Expiry sweep every 10 seconds
            let terminals = ws_state.server.get_terminals();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(10)).await;
                    let expired = {
                        order_store
                            .lock()
                            .unwrap()
                            .expire_stale_orders()
                            .unwrap_or_default()
                    };
                    for (order_id, order_number) in expired {
                        let msg = websocket::WsMessage::new(
                            "ORDER_EXPIRED",
                            serde_json::json!({
                                "orderId": order_id,
                                "orderNumber": order_number
                            }),
                        );
                        websocket::broadcast_all(&terminals, &msg).await;
                        log::info!("Order {} ({}) expired", order_number, order_id);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::websocket::broadcast_to_kiosk,
            commands::websocket::broadcast_to_pos,
            commands::websocket::broadcast_to_all,
            commands::websocket::send_to_terminal_cmd,
            commands::websocket::get_connected_terminals,
            commands::websocket::get_server_info,
            commands::order_store::get_active_orders,
            commands::order_store::get_order,
            commands::order_store::get_all_orders,
            commands::order_store::complete_pos_order,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
