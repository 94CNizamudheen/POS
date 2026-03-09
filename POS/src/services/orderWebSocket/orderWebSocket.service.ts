import { OrderWebSocketClient } from "./OrderWebSocketClient";
import { orderEventBus } from "./orderEventBus";
import type { OrderLineItem, PaymentMethod, TerminalType } from "@/types/order";

class OrderWebSocketService {
  private client: OrderWebSocketClient | null = null;
  private connectionChangeCb: ((connected: boolean) => void) | null = null;

  /** Creates a new WS client and connects. Safe to call again for reconnect with new settings. */
  init(wsUrl: string, terminalId: string, terminalType: TerminalType): void {
    if (this.client) {
      this.client.disconnect();
    }

    const client = new OrderWebSocketClient(wsUrl, terminalId, terminalType);

    // Route every incoming WS message into the event bus
    client.on("*", (msg) => orderEventBus.emit(msg));

    // Re-apply stored connection change callback on new client
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

  // ─── POS actions ──────────────────────────────────────────────────────────

  /** POS: send items to a KIOSK (or broadcast to all KIOSKs) */
  sendToKiosk(items: OrderLineItem[], targetKioskId?: string): void {
    this.client?.send("SEND_TO_KIOSK", { items, targetKioskId });
  }

  /** POS: claim an incoming order from KIOSK */
  claimOrder(orderId: string): void {
    this.client?.send("CLAIM_ORDER", { orderId });
  }

  /** POS: complete an order with payment method */
  completeOrder(orderId: string, method: PaymentMethod): void {
    this.client?.send("COMPLETE_ORDER", { orderId, method });
  }

  // ─── KIOSK actions ────────────────────────────────────────────────────────

  /** KIOSK: request cashier assistance with current cart */
  requestAssistance(items: OrderLineItem[]): void {
    this.client?.send("REQUEST_ASSISTANCE", { items });
  }

  // ─── Granular item actions (assistance session) ───────────────────────────

  /** Add an item to a shared order (or increment if it already exists) */
  addItem(orderId: string, item: OrderLineItem): void {
    this.client?.send("ADD_ITEM", { orderId, item });
  }

  /** Remove an item from a shared order by productId */
  removeItem(orderId: string, productId: string): void {
    this.client?.send("REMOVE_ITEM", { orderId, productId });
  }

  /** Set an item's quantity (0 removes it) */
  changeQty(orderId: string, productId: string, qty: number): void {
    this.client?.send("CHANGE_QTY", { orderId, productId, qty });
  }

  /** Apply a fixed discount amount to an order */
  applyDiscount(orderId: string, amount: number): void {
    this.client?.send("APPLY_DISCOUNT", { orderId, amount });
  }

  /** POS: instruct a specific KIOSK (or all KIOSKs) to wipe their local DB */
  sendClearKioskData(targetKioskId?: string): void {
    this.client?.send("CLEAR_KIOSK_DATA", { targetKioskId: targetKioskId ?? null });
  }

  /** POS: request the current cart from a side-by-side KIOSK.
   *  The KIOSK will respond with REQUEST_ASSISTANCE → ORDER_AVAILABLE.
   *  Pass the callback so the caller can auto-claim on arrival. */
  pullKioskCart(targetKioskId: string): void {
    this.client?.send("PULL_KIOSK_CART", { targetKioskId });
  }

  getPairedKioskId(): string {
    return (import.meta.env.VITE_PAIRED_KIOSK_ID as string) ?? "";
  }

  // ─── Shared actions ───────────────────────────────────────────────────────

  /** Either terminal: update order items */
  updateOrder(orderId: string, items: OrderLineItem[]): void {
    this.client?.send("UPDATE_ORDER", { orderId, items });
  }

  /** Either terminal: release order ownership back to unclaimed */
  releaseOrder(orderId: string): void {
    this.client?.send("RELEASE_ORDER", { orderId });
  }
}

export const orderWebSocketService = new OrderWebSocketService();
