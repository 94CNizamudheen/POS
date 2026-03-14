import { OrderWebSocketClient } from "./OrderWebSocketClient";
import { orderEventBus } from "./orderEventBus";
import type { OrderLineItem, TerminalType } from "@/types/order";

class OrderWebSocketService {
  private client: OrderWebSocketClient | null = null;
  private connectionChangeCb: ((connected: boolean) => void) | null = null;

  init(wsUrl: string, terminalId: string, terminalType: TerminalType): void {
    if (this.client) {
      this.client.disconnect();
    }
    const client = new OrderWebSocketClient(wsUrl, terminalId, terminalType);
    client.on("*", (msg) => orderEventBus.emit(msg));
    if (this.connectionChangeCb) {
      client.onConnectionChange(this.connectionChangeCb);
    }
    this.client = client;
    client.connect().catch(console.error);
  }

  disconnect(): void {
    this.client?.disconnect();
    this.client = null;
  }

  isConnected(): boolean {
    return this.client?.isConnected() ?? false;
  }

  getTerminalId(): string {
    return this.client?.getTerminalId() ?? "";
  }

  forceReconnect(): void {
    this.client?.forceReconnect();
  }

  onConnectionChange(cb: (connected: boolean) => void): void {
    this.connectionChangeCb = cb;
    this.client?.onConnectionChange(cb);
  }

  requestAssistance(items: OrderLineItem[]): void {
    this.client?.send("REQUEST_ASSISTANCE", { items });
  }

  acceptKioskOrder(orderId: string): void {
    this.client?.send("KIOSK_ACCEPTED", { orderId });
  }

  completeKioskOrder(orderId: string | null, items: OrderLineItem[], method: string): void {
    this.client?.send("KIOSK_COMPLETE_ORDER", { orderId, items, method });
  }

  updateOrder(orderId: string, items: OrderLineItem[]): void {
    this.client?.send("UPDATE_ORDER", { orderId, items });
  }

  releaseOrder(orderId: string): void {
    this.client?.send("RELEASE_ORDER", { orderId });
  }

  claimOrder(orderId: string): void {
    this.client?.send("CLAIM_ORDER", { orderId });
  }
}

export const orderWebSocketService = new OrderWebSocketService();
