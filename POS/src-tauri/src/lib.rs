mod commands;
mod db;
mod order_store;
mod printer;
mod websocket;

use std::sync::{Arc, Mutex};
use tauri::Manager;
use tokio::sync::mpsc;
use websocket::{EventBusState, WebSocketServer, WsState};

/// Shared database path — used by app-level commands (e.g. clear_all_data)
/// that need a DB connection independently of any specific module.
pub struct AppDbPath(pub String);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // ── Local DB migrations (app_state table, etc.) ───────────────────
            db::init(app.handle());

            // ── Resolve DB path ───────────────────────────────────────────────
            let db_path = app
                .path()
                .app_data_dir()
                .map(|p| {
                    std::fs::create_dir_all(&p).ok();
                    p.join("orders.db").to_string_lossy().to_string()
                })
                .unwrap_or_else(|_| "./orders.db".to_string());

            // Make the path available to app-level commands independently
            app.manage(AppDbPath(db_path.clone()));

            // ── Order store (SQLite) ──────────────────────────────────────────
            let order_store = Arc::new(Mutex::new(
                order_store::OrderStore::new(&db_path)
                    .expect("Failed to initialise order store"),
            ));

            // ── WebSocket server ──────────────────────────────────────────────
            let (event_tx, event_rx) = mpsc::unbounded_channel();

            let event_bus = websocket::event_bus::EventBus::new(event_rx);
            let event_bus_clone = event_bus.clone();

            let ws_server = Arc::new(WebSocketServer::new(event_tx, order_store.clone()));

            let ws_state = WsState { server: ws_server.clone() };

            app.manage(ws_state.clone());
            app.manage(EventBusState { bus: event_bus.clone() });
            app.manage(order_store.clone());

            // Register WS routes
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

            // Start WS server on port 3001
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
            // ── WebSocket ────────────────────────────────────────────────────
            commands::websocket::broadcast_to_kiosk,
            commands::websocket::broadcast_to_pos,
            commands::websocket::broadcast_to_all,
            commands::websocket::send_to_terminal_cmd,
            commands::websocket::get_connected_terminals,
            commands::websocket::get_server_info,
            // ── Orders ───────────────────────────────────────────────────────
            commands::order_store::get_active_orders,
            commands::order_store::get_order,
            commands::order_store::get_all_orders,
            commands::order_store::complete_pos_order,
            commands::order_store::save_held_order,
            commands::order_store::get_all_held_orders,
            commands::order_store::delete_held_order,
            // ── App state ────────────────────────────────────────────────────
            commands::app_state::clear_all_data,
            commands::app_state::get_app_state,
            commands::app_state::set_app_state,
            // ── Printer ──────────────────────────────────────────────────────
            commands::printer::get_printers,
            commands::printer::get_active_printers,
            commands::printer::get_printer,
            commands::printer::save_printer,
            commands::printer::delete_printer,
            commands::printer::set_printer_active,
            commands::printer::test_printer,
            commands::printer::print_raw,
            commands::printer::list_bluetooth_ports,
            commands::printer::get_system_printers,
            commands::printer::print_to_system_printer,
            commands::printer::add_system_printer_to_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
