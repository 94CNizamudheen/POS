export interface CustomerDisplayCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: { name: string; qty: number }[];
}

/** Sent from POS to Customer Display whenever the cart changes */
export interface CustomerDisplayCartPayload {
  items: CustomerDisplayCartItem[];
  subtotal: number;
  charges: {
    id: string;
    name: string;
    amount: number;
    applied: boolean;
  }[];
  totalCharges: number;
  discounts?: { name: string; discountAmount: number }[];
  /** Per-item promotion breakdown: itemId → list of { caption, amount } */
  itemDiscounts?: Record<string, { caption: string; amount: number }[]>;
  grandTotal: number;
  currencyCode: string;
}

/** Sent from POS to Customer Display when an order is completed */
export interface CustomerDisplayOrderCompletePayload {
  ticketNumber: string;
  grandTotal: number;
  currencyCode: string;
  queueNumber: number;
}

/** The full state that the Customer Display renders */
export interface CustomerDisplayState {
  status: "idle" | "active" | "order-complete";
  cart: CustomerDisplayCartPayload | null;
  orderComplete: CustomerDisplayOrderCompletePayload | null;
  logoUrl: string | null;
  welcomeMessage: string;
}

/** A single promo media item in the slideshow */
export interface PromoMediaItem {
  id: string;
  url: string;
  type: "image" | "video" | "gif";
}

/** Customer display settings persisted to localStorage */
export interface CustomerDisplaySettings {
  welcomeMessage: string;
  promoMedia: PromoMediaItem[];
}

export const CUSTOMER_DISPLAY_EVENTS = {
  CART_UPDATE: "customer_display_cart_update",
  ORDER_COMPLETE: "customer_display_order_complete",
  CLEAR: "customer_display_clear",
  BRANDING_UPDATE: "customer_display_branding_update",
} as const;
