import type { WsMessage, WsMessageType } from "@/types/order";

export type OrderEventHandler = (message: WsMessage<any>) => void;

class OrderEventBus {
  private handlers: Map<string, OrderEventHandler[]> = new Map();

  subscribe(eventType: WsMessageType | "*", handler: OrderEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    return () => this.unsubscribe(eventType, handler);
  }

  private unsubscribe(eventType: string, handler: OrderEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const i = handlers.indexOf(handler);
      if (i > -1) handlers.splice(i, 1);
    }
  }

  emit(message: WsMessage<any>): void {
    const specific = this.handlers.get(message.type);
    specific?.forEach((h) => h(message));
    const wildcard = this.handlers.get("*");
    wildcard?.forEach((h) => h(message));
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const orderEventBus = new OrderEventBus();
