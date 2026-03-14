export interface LocalEvent<T = any> {
  type: string;
  payload: T;
  timestamp?: number;
}

export type LocalEventHandler<T = any> = (event: LocalEvent<T>) => void;

class LocalEventBus {
  private handlers: Map<string, LocalEventHandler[]> = new Map();

  subscribe<T = any>(eventType: string, handler: LocalEventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as LocalEventHandler);
    return () => this.unsubscribe(eventType, handler);
  }

  unsubscribe(eventType: string, handler: LocalEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  emit<T = any>(eventType: string, payload: T): void {
    const event: LocalEvent<T> = { type: eventType, payload, timestamp: Date.now() };
    const handlers = this.handlers.get(eventType);
    if (handlers) handlers.forEach((h) => h(event));
    const wildcardHandlers = this.handlers.get("*");
    if (wildcardHandlers) wildcardHandlers.forEach((h) => h(event));
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const localEventBus = new LocalEventBus();

export const LocalEventTypes = {
  TICKET_CREATED: "ticket:created",
  KDS_TICKET_REMOVED: "kds:ticket_removed",
  KDS_STATUS_CHANGED: "kds:status_changed",
  KDS_ITEM_TOGGLED: "kds:item_toggled",
  QUEUE_UPDATED: "queue:updated",
  QUEUE_TOKEN_CALLED: "queue:token_called",
  QUEUE_TOKEN_SERVED: "queue:token_served",
  CUSTOMER_DISPLAY_CART_UPDATE: "customer_display:cart_update",
  CUSTOMER_DISPLAY_ORDER_COMPLETE: "customer_display:order_complete",
  CUSTOMER_DISPLAY_CLEAR: "customer_display:clear",
  CUSTOMER_DISPLAY_BRANDING_UPDATE: "customer_display:branding_update",
  WORKDAY_STARTED: "workday:started",
  WORKDAY_ENDED: "workday:ended",
} as const;
