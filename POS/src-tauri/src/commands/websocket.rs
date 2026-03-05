use crate::websocket::{
    broadcast_all, broadcast_to_terminal_type, send_to_terminal, WsMessage, WsState,
};
use serde::Serialize;
use tauri::{command, State};

#[derive(Serialize)]
pub struct TerminalInfo {
    #[serde(rename = "terminalId")]
    pub terminal_id: String,
    #[serde(rename = "terminalType")]
    pub terminal_type: String,
}

/// List all currently connected terminals (live snapshot).
#[command]
pub async fn get_connected_terminals(
    ws_state: State<'_, WsState>,
) -> Result<Vec<TerminalInfo>, String> {
    let terminals = ws_state.server.get_terminals();
    let map = terminals.read().await;
    let list = map
        .values()
        .map(|t| TerminalInfo {
            terminal_id: t.terminal_id.clone(),
            terminal_type: t.terminal_type.clone(),
        })
        .collect();
    Ok(list)
}

/// Return the local machine IP and WebSocket server port.
#[command]
pub fn get_server_info() -> Result<serde_json::Value, String> {
    let ip = local_ip();
    Ok(serde_json::json!({
        "ip": ip,
        "port": 3001,
        "wsUrl": format!("ws://{}:3001", ip),
    }))
}

fn local_ip() -> String {
    use std::net::UdpSocket;
    UdpSocket::bind("0.0.0.0:0")
        .and_then(|s| {
            s.connect("8.8.8.8:80")?;
            s.local_addr()
        })
        .map(|addr| addr.ip().to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

/// Broadcast a message to all connected KIOSK terminals
#[command]
pub async fn broadcast_to_kiosk(
    ws_state: State<'_, WsState>,
    message: WsMessage,
) -> Result<(), String> {
    let terminals = ws_state.server.get_terminals();
    broadcast_to_terminal_type(&terminals, "KIOSK", &message).await;
    Ok(())
}

/// Broadcast a message to all connected POS terminals
#[command]
pub async fn broadcast_to_pos(
    ws_state: State<'_, WsState>,
    message: WsMessage,
) -> Result<(), String> {
    let terminals = ws_state.server.get_terminals();
    broadcast_to_terminal_type(&terminals, "POS", &message).await;
    Ok(())
}

/// Broadcast a message to all connected terminals
#[command]
pub async fn broadcast_to_all(
    ws_state: State<'_, WsState>,
    message: WsMessage,
) -> Result<(), String> {
    let terminals = ws_state.server.get_terminals();
    broadcast_all(&terminals, &message).await;
    Ok(())
}

/// Send a message to a specific terminal by ID
#[command]
pub async fn send_to_terminal_cmd(
    ws_state: State<'_, WsState>,
    terminal_id: String,
    message: WsMessage,
) -> Result<(), String> {
    let terminals = ws_state.server.get_terminals();
    send_to_terminal(&terminals, &terminal_id, &message).await;
    Ok(())
}
