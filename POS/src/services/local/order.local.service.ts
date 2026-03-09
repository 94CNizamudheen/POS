import { invoke } from "@tauri-apps/api/core";
import type { Order, OrderLineItem, PaymentMethod } from "@/types/order";

// ── Held order ──────────────────────────────────────────────────────────────
export interface HeldOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  /** Full Order serialised as JSON */
  orderJson: string;
  total: number;
  heldAt: number;
}

export const orderLocalService = {
  // ── Orders ──────────────────────────────────────────────────────────────
  getAll(limit = 100): Promise<Order[]> {
    return invoke("get_all_orders", { limit });
  },

  completePosOrder(
    items: OrderLineItem[],
    paymentMethod: PaymentMethod,
    terminalId: string,
  ): Promise<Order> {
    return invoke("complete_pos_order", { items, paymentMethod, terminalId });
  },

  // ── Held orders ─────────────────────────────────────────────────────────
  saveHeld(order: Order): Promise<void> {
    const held: HeldOrder = {
      id: order.orderId,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      orderJson: JSON.stringify(order),
      total: order.total,
      heldAt: Date.now(),
    };
    return invoke("save_held_order", { held });
  },

  getAllHeld(): Promise<HeldOrder[]> {
    return invoke("get_all_held_orders");
  },

  deleteHeld(orderId: string): Promise<void> {
    return invoke("delete_held_order", { orderId });
  },

  parseHeldOrder(held: HeldOrder): Order | null {
    try {
      return JSON.parse(held.orderJson) as Order;
    } catch {
      return null;
    }
  },

  // ── Data management ─────────────────────────────────────────────────────
  clearAllData(): Promise<void> {
    return invoke("clear_all_data");
  },
};
