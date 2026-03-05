// Canonical order types — keep in sync with POS/server/src/types.ts

export type OrderStatus =
  | "DRAFT"
  | "TRANSFERRED"
  | "IN_PROGRESS"
  | "PAYMENT_PENDING"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";

export type TerminalType = "KIOSK" | "POS";

export type PaymentMethod = "CASH" | "CARD" | "EWALLET";

export interface TerminalIdentity {
  terminalId: string;
  type: TerminalType;
}

export interface OrderLineItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
}

export interface Order {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  originTerminal: TerminalIdentity;
  ownerTerminal: TerminalIdentity | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  completedAt?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export type WsMessageType =
  | "IDENTIFY"
  | "IDENTIFIED"
  | "PING"
  | "PONG"
  | "REQUEST_ASSISTANCE"
  | "ORDER_AVAILABLE"
  | "CLAIM_ORDER"
  | "CLAIM_ACK"
  | "CLAIM_REJECTED"
  | "SEND_TO_KIOSK"
  | "ORDER_ASSIGNED"
  | "UPDATE_ORDER"
  | "ORDER_UPDATED"
  | "RELEASE_ORDER"
  | "COMPLETE_ORDER"
  | "ORDER_COMPLETED"
  | "ORDER_EXPIRED"
  | "ERROR";

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload: T;
  timestamp: number;
  messageId: string;
}
