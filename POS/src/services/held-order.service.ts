import { invoke } from "@tauri-apps/api/core";
import type { Order } from "@/types/order";

export interface HeldOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  /** Full Order serialised as JSON */
  orderJson: string;
  total: number;
  heldAt: number;
}

export const heldOrderService = {
  async save(order: Order): Promise<void> {
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

  getAll(): Promise<HeldOrder[]> {
    return invoke("get_all_held_orders");
  },

  delete(orderId: string): Promise<void> {
    return invoke("delete_held_order", { orderId });
  },

  parseOrder(held: HeldOrder): Order | null {
    try {
      return JSON.parse(held.orderJson) as Order;
    } catch {
      return null;
    }
  },
};
