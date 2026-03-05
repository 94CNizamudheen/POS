use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, RwLock};
use tokio_tungstenite::{accept_async, tungstenite::Message};

use crate::order_store::SharedOrderStore;

pub mod event_bus;
pub mod ws_routes;

// ── Wire protocol — matches TypeScript WsMessage ─────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub payload: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<i64>,
    #[serde(rename = "messageId", skip_serializing_if = "Option::is_none")]
    pub message_id: Option<String>,
}

impl WsMessage {
    pub fn new(msg_type: impl Into<String>, payload: serde_json::Value) -> Self {
        Self {
            msg_type: msg_type.into(),
            payload,
            timestamp: Some(chrono::Utc::now().timestamp_millis()),
            message_id: Some(uuid::Uuid::new_v4().to_string()),
        }
    }
}

// ── Internal routable message (includes sender context) ──────────────────────

#[derive(Debug, Clone)]
pub struct RoutableMessage {
    pub msg_type: String,
    pub payload: serde_json::Value,
    pub sender_id: Option<String>,
    pub sender_type: Option<String>,
}

// ── Connected terminal ────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct ConnectedTerminal {
    pub terminal_id: String,
    pub terminal_type: String,
    pub tx: mpsc::UnboundedSender<Message>,
}

pub type TerminalMap = Arc<RwLock<HashMap<String, ConnectedTerminal>>>;

// ── WebSocket Server ──────────────────────────────────────────────────────────

pub struct WebSocketServer {
    terminals: TerminalMap,
    event_tx: mpsc::UnboundedSender<RoutableMessage>,
    order_store: SharedOrderStore,
}

impl WebSocketServer {
    pub fn new(
        event_tx: mpsc::UnboundedSender<RoutableMessage>,
        order_store: SharedOrderStore,
    ) -> Self {
        Self {
            terminals: Arc::new(RwLock::new(HashMap::new())),
            event_tx,
            order_store,
        }
    }

    pub async fn start(&self, addr: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let listener = match TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(e) if e.kind() == std::io::ErrorKind::AddrInUse => {
                log::info!("WebSocket server already running on {}", addr);
                return Ok(());
            }
            Err(e) => return Err(Box::new(e)),
        };

        log::info!("WebSocket server listening on {}", addr);

        let terminals = self.terminals.clone();
        let event_tx = self.event_tx.clone();
        let order_store = self.order_store.clone();

        tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((stream, peer_addr)) => {
                        let terminals = terminals.clone();
                        let event_tx = event_tx.clone();
                        let order_store = order_store.clone();
                        tokio::spawn(async move {
                            if let Err(e) =
                                handle_connection(stream, peer_addr, terminals, event_tx, order_store).await
                            {
                                log::error!("WebSocket error from {}: {}", peer_addr, e);
                            }
                        });
                    }
                    Err(e) => {
                        log::error!("WebSocket accept error: {}", e);
                        break;
                    }
                }
            }
            log::warn!("WebSocket server accept loop exited");
        });

        Ok(())
    }

    pub fn get_terminals(&self) -> TerminalMap {
        self.terminals.clone()
    }
}

// ── Connection handler ────────────────────────────────────────────────────────

async fn handle_connection(
    stream: TcpStream,
    addr: SocketAddr,
    terminals: TerminalMap,
    event_tx: mpsc::UnboundedSender<RoutableMessage>,
    order_store: SharedOrderStore,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    log::info!("New connection from {}", addr);

    let ws_stream = accept_async(stream).await?;
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();
    let mut terminal_id: Option<String> = None;
    let mut terminal_type: Option<String> = None;

    // Outgoing messages → WebSocket
    let sender_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Incoming messages
    while let Some(msg) = ws_receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                match serde_json::from_str::<WsMessage>(&text) {
                    Ok(ws_msg) => match ws_msg.msg_type.as_str() {
                        "PING" => {
                            let pong = WsMessage::new("PONG", serde_json::json!({}));
                            let text = serde_json::to_string(&pong)
                                .unwrap_or_default()
                                .into();
                            let _ = tx.send(Message::Text(text));
                        }

                        "IDENTIFY" => {
                            let tid = ws_msg
                                .payload
                                .get("terminalId")
                                .and_then(|v| v.as_str())
                                .unwrap_or("unknown")
                                .to_string();
                            let ttype = ws_msg
                                .payload
                                .get("type")
                                .and_then(|v| v.as_str())
                                .unwrap_or("POS")
                                .to_string();

                            terminals.write().await.insert(
                                tid.clone(),
                                ConnectedTerminal {
                                    terminal_id: tid.clone(),
                                    terminal_type: ttype.clone(),
                                    tx: tx.clone(),
                                },
                            );

                            terminal_id = Some(tid.clone());
                            terminal_type = Some(ttype);
                            log::info!("Identified terminal: {}", tid);

                            // Reply with IDENTIFIED + active orders
                            let active_orders = {
                                order_store
                                    .lock()
                                    .unwrap()
                                    .get_active_orders()
                                    .unwrap_or_default()
                            };
                            let ack = WsMessage::new(
                                "IDENTIFIED",
                                serde_json::json!({
                                    "terminalId": tid,
                                    "activeOrders": active_orders,
                                }),
                            );
                            let text = serde_json::to_string(&ack)
                                .unwrap_or_default()
                                .into();
                            let _ = tx.send(Message::Text(text));
                        }

                        _ => {
                            let routable = RoutableMessage {
                                msg_type: ws_msg.msg_type,
                                payload: ws_msg.payload,
                                sender_id: terminal_id.clone(),
                                sender_type: terminal_type.clone(),
                            };
                            if let Err(e) = event_tx.send(routable) {
                                log::error!("Failed to forward to EventBus: {}", e);
                            }
                        }
                    },
                    Err(e) => log::warn!("Invalid message from {}: {}", addr, e),
                }
            }
            Ok(Message::Close(_)) => {
                log::info!("Terminal disconnected: {}", addr);
                break;
            }
            Err(e) => {
                log::error!("WebSocket error from {}: {}", addr, e);
                break;
            }
            _ => {}
        }
    }

    // Cleanup
    if let Some(id) = terminal_id {
        terminals.write().await.remove(&id);
        log::info!("Removed terminal {}", id);
    }

    sender_task.abort();
    Ok(())
}

// ── WsState (managed Tauri state) ────────────────────────────────────────────

#[derive(Clone)]
pub struct WsState {
    pub server: Arc<WebSocketServer>,
}

#[derive(Clone)]
pub struct EventBusState {
    pub bus: event_bus::EventBus,
}

// ── Broadcast helpers ─────────────────────────────────────────────────────────

pub async fn broadcast_to_terminal_type(
    terminals: &TerminalMap,
    terminal_type: &str,
    message: &WsMessage,
) {
    let terminals = terminals.read().await;
    let text = match serde_json::to_string(message) {
        Ok(t) => t,
        Err(e) => {
            log::error!("Failed to serialize message: {}", e);
            return;
        }
    };
    for terminal in terminals.values() {
        if terminal.terminal_type == terminal_type {
            let _ = terminal.tx.send(Message::Text(text.clone().into()));
        }
    }
}

pub async fn broadcast_all(terminals: &TerminalMap, message: &WsMessage) {
    let terminals = terminals.read().await;
    let text = match serde_json::to_string(message) {
        Ok(t) => t,
        Err(e) => {
            log::error!("Failed to serialize message: {}", e);
            return;
        }
    };
    for terminal in terminals.values() {
        let _ = terminal.tx.send(Message::Text(text.clone().into()));
    }
}

pub async fn send_to_terminal(terminals: &TerminalMap, terminal_id: &str, message: &WsMessage) {
    let terminals = terminals.read().await;
    if let Some(terminal) = terminals.get(terminal_id) {
        if let Ok(text) = serde_json::to_string(message) {
            let _ = terminal.tx.send(Message::Text(text.into()));
        }
    } else {
        log::warn!("send_to_terminal: {} not connected", terminal_id);
    }
}
