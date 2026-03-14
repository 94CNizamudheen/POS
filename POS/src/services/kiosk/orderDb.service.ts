import { invoke } from "@tauri-apps/api/core";
import type { Order } from "@/types/order";

export async function upsertOrder(order: Order): Promise<void> {
  await invoke("upsert_order", { order });
}

export async function getOrder(orderId: string): Promise<Order | null> {
  return invoke<Order | null>("get_order", { orderId });
}

export async function getActiveOrders(): Promise<Order[]> {
  return invoke<Order[]>("get_active_orders");
}

export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  return invoke<boolean>("update_order_status", { orderId, status });
}

export async function markOrderCompleted(orderId: string, paymentMethod?: string): Promise<boolean> {
  return invoke<boolean>("mark_order_completed", { orderId, paymentMethod });
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  return invoke<boolean>("delete_order", { orderId });
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  return invoke<Order | null>("get_order_by_number", { orderNumber });
}
