use super::RoutableMessage;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

pub type EventHandler = Arc<dyn Fn(&RoutableMessage) + Send + Sync>;

#[derive(Clone)]
pub struct EventBus {
    handlers: Arc<RwLock<HashMap<String, Vec<EventHandler>>>>,
    rx: Arc<RwLock<mpsc::UnboundedReceiver<RoutableMessage>>>,
}

impl EventBus {
    pub fn new(rx: mpsc::UnboundedReceiver<RoutableMessage>) -> Self {
        Self {
            handlers: Arc::new(RwLock::new(HashMap::new())),
            rx: Arc::new(RwLock::new(rx)),
        }
    }

    pub async fn subscribe<F>(&self, event_type: &str, handler: F)
    where
        F: Fn(&RoutableMessage) + Send + Sync + 'static,
    {
        self.handlers
            .write()
            .await
            .entry(event_type.to_string())
            .or_default()
            .push(Arc::new(handler));
        log::info!("EventBus subscribed to: {}", event_type);
    }

    pub async fn start(&self) {
        log::info!("EventBus started");
        loop {
            let message = {
                let mut rx = self.rx.write().await;
                rx.recv().await
            };
            match message {
                Some(msg) => self.dispatch(&msg).await,
                None => {
                    log::error!("EventBus channel closed");
                    break;
                }
            }
        }
    }

    async fn dispatch(&self, message: &RoutableMessage) {
        let handlers = self.handlers.read().await;

        if let Some(specific) = handlers.get(&message.msg_type) {
            for h in specific {
                h(message);
            }
        }

        if let Some(wildcard) = handlers.get("*") {
            for h in wildcard {
                h(message);
            }
        }
    }
}
