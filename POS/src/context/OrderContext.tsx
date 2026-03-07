import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import type {
  Order,
  WsMessage,
  OrderLineItem,
  PaymentMethod,
} from "@/types/order";
import { heldOrderService } from "@/services/held-order.service";
import type { CartItem } from "@/UI/components/menu-selection/CartSidebar";
import { orderEventBus } from "@/services/orderWebSocket/orderEventBus";
import { orderWebSocketService } from "@/services/orderWebSocket/orderWebSocket.service";

interface OrderContextValue {
  activeOrder: Order | null;
  /** Increments each time a KIOSK customer accepts a POS-sent order — triggers cart clear */
  kioskAcceptedAt: number;
  incomingOrders: Order[];
  isConnected: boolean;
  notification: string | null;
  lastCompletedOrder: Order | null;
  clearNotification: () => void;
  clearCompletedOrder: () => void;
  /** The order most recently sent to a KIOSK — shown in the KioskSentBanner */
  kioskSentOrder: Order | null;
  clearKioskSentOrder: () => void;
  sendToKiosk: (items: CartItem[], targetKioskId?: string) => void;
  claimOrder: (orderId: string) => void;
  /**
   * Called by MenuSelection on unmount when there is no activeOrder.
   * Stores the walk-up cart in a ref so CLAIM_ACK can hold it if needed.
   */
  stashWalkupCart: (items: CartItem[]) => void;
  /**
   * Called by MenuSelection on mount.
   * Returns any stashed walk-up cart items and clears the stash.
   */
  popWalkupCart: () => CartItem[];
  /** Resume a held order — saves the current active order to hold first if needed */
  resumeHeldOrder: (order: Order) => void;
  /** Clear a local DRAFT active order without sending a WS message */
  clearActiveOrder: () => void;
  updateOrder: (orderId: string, items: CartItem[]) => void;
  completeOrder: (orderId: string, method: PaymentMethod) => void;
  completeDirectOrder: (
    items: CartItem[],
    method: PaymentMethod,
  ) => Promise<void>;
  releaseOrder: (orderId: string) => void;
}

const OrderContext = createContext<OrderContextValue | null>(null);

function toLineItems(items: CartItem[]): OrderLineItem[] {
  return items.map((i) => ({
    productId: i.id,
    name: i.name,
    price: i.price,
    qty: i.qty,
    subtotal: i.price * i.qty,
  }));
}

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [incomingOrders, setIncomingOrders] = useState<Order[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(
    null,
  );

  const [kioskAcceptedAt, setKioskAcceptedAt] = useState(0);
  const [kioskSentOrder, setKioskSentOrder] = useState<Order | null>(null);

  const activeOrderRef = useRef<Order | null>(null);
  activeOrderRef.current = activeOrder;

  // Tracks the order ID of the most recent SEND_TO_KIOSK so we can detect
  // when the KIOSK customer releases it (second ORDER_UPDATED for that order)
  const kioskSentOrderIdRef = useRef<string | null>(null);

  // Stash for walk-up cart items saved on MenuSelection unmount
  const walkupCartRef = useRef<CartItem[]>([]);

  // Shared helper: persist a list of CartItems as a synthetic DRAFT held order
  function saveItemsAsHeld(items: CartItem[]) {
    if (items.length === 0) return;
    const terminalId = orderWebSocketService.getTerminalId() || "POS-1";
    const lineItems = toLineItems(items);
    const subtotal = lineItems.reduce((s, i) => s + i.subtotal, 0);
    const tax = subtotal * 0.1;
    const now = Date.now();
    heldOrderService
      .save({
        orderId: crypto.randomUUID(),
        orderNumber: `WALK-${new Date(now).toLocaleTimeString("en", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}`,
        status: "DRAFT",
        items: lineItems,
        subtotal,
        tax,
        total: subtotal + tax,
        originTerminal: { terminalId, type: "POS" },
        ownerTerminal: { terminalId, type: "POS" },
        createdAt: now,
        updatedAt: now,
        expiresAt: now + 30 * 60 * 1000,
      })
      .catch(console.error);
  }

  useEffect(() => {
    const terminalId = import.meta.env.VITE_TERMINAL_ID ?? "POS-1";
    const wsUrl = import.meta.env.VITE_WS_URL ?? "ws://127.0.0.1:3001";
    orderWebSocketService.init(wsUrl, terminalId, "POS");
    orderWebSocketService.onConnectionChange(setIsConnected);

    // ── Event subscriptions ──────────────────────────────────────────────────

    const unsubs = [
      // On (re)connect: reconcile state from server
      orderEventBus.subscribe(
        "IDENTIFIED",
        (msg: WsMessage<{ activeOrders: Order[] }>) => {
          setIsConnected(true);
          const myId = orderWebSocketService.getTerminalId();
          const incoming = msg.payload.activeOrders.filter(
            (o) =>
              o.status === "TRANSFERRED" && o.originTerminal.type === "KIOSK",
          );
          setIncomingOrders(incoming);

          const mine = msg.payload.activeOrders.find(
            (o) => o.ownerTerminal?.terminalId === myId,
          );
          setActiveOrder(mine ?? null);
        },
      ),

      // New KIOSK order available to claim
      orderEventBus.subscribe(
        "ORDER_AVAILABLE",
        (msg: WsMessage<{ order: Order }>) => {
          setIncomingOrders((prev) => {
            const already = prev.some(
              (o) => o.orderId === msg.payload.order.orderId,
            );
            return already ? prev : [...prev, msg.payload.order];
          });
        },
      ),

      // This POS successfully claimed an order
      orderEventBus.subscribe(
        "CLAIM_ACK",
        (msg: WsMessage<{ order: Order }>) => {
          const order = msg.payload.order;
          // Hold the current server-tracked active order (if any)
          if (
            activeOrderRef.current &&
            activeOrderRef.current.orderId !== order.orderId
          ) {
            heldOrderService.save(activeOrderRef.current).catch(console.error);
          }
          // Hold the walk-up cart stashed by MenuSelection on unmount (if any)
          if (walkupCartRef.current.length > 0) {
            saveItemsAsHeld(walkupCartRef.current);
            walkupCartRef.current = [];
          }
          setActiveOrder(order);
          setIncomingOrders((prev) =>
            prev.filter((o) => o.orderId !== order.orderId),
          );
          navigate("/");
        },
      ),

      // Another POS already claimed it
      orderEventBus.subscribe("CLAIM_REJECTED", () => {
        setNotification("Already claimed by another cashier");
      }),

      // Order state updated
      orderEventBus.subscribe(
        "ORDER_UPDATED",
        (msg: WsMessage<{ order: Order }>) => {
          const updated = msg.payload.order;
          const myId = orderWebSocketService.getTerminalId();

          // Customer accepted and took the order back (KIOSK released it from this POS)
          // → clear our active order so the cart is freed up
          if (
            activeOrderRef.current?.orderId === updated.orderId &&
            activeOrderRef.current?.ownerTerminal?.terminalId === myId &&
            updated.ownerTerminal?.terminalId !== myId
          ) {
            setActiveOrder(null);
            return;
          }

          // Track SEND_TO_KIOSK orders: first UPDATE = server confirmation,
          // subsequent UPDATEs = item edits from KIOSK customer,
          // update with no ownerTerminal = KIOSK customer released/accepted
          if (
            updated.originTerminal.terminalId === myId &&
            updated.originTerminal.type === "POS"
          ) {
            if (kioskSentOrderIdRef.current === updated.orderId) {
              if (!updated.ownerTerminal) {
                // Released — clear POS cart and banner
                kioskSentOrderIdRef.current = null;
                setKioskSentOrder(null);
                setKioskAcceptedAt((n) => n + 1);
              } else {
                // Still active — keep banner up to date (e.g. KIOSK added items)
                setKioskSentOrder(updated);
              }
            } else {
              // First update — server confirmed the SEND_TO_KIOSK, show banner
              kioskSentOrderIdRef.current = updated.orderId;
              setKioskSentOrder(updated);
            }
          }

          setActiveOrder((prev) =>
            prev?.orderId === updated.orderId ? updated : prev,
          );
          // Remove from incoming if it's now claimed
          if (updated.ownerTerminal) {
            setIncomingOrders((prev) =>
              prev.filter((o) => o.orderId !== updated.orderId),
            );
          }
        },
      ),

      // Order completed (by anyone)
      orderEventBus.subscribe(
        "ORDER_COMPLETED",
        (msg: WsMessage<{ order: Order }>) => {
          if (activeOrderRef.current?.orderId === msg.payload.order.orderId) {
            setLastCompletedOrder(msg.payload.order);
            setActiveOrder(null);
          }
        },
      ),

      // Order expired
      orderEventBus.subscribe(
        "ORDER_EXPIRED",
        (msg: WsMessage<{ orderId: string }>) => {
          const { orderId } = msg.payload;
          setIncomingOrders((prev) =>
            prev.filter((o) => o.orderId !== orderId),
          );
          // Also remove from persistent held store if it expired while held
          heldOrderService.delete(orderId).catch(() => {});
          if (activeOrderRef.current?.orderId === orderId) {
            setActiveOrder(null);
          }
          if (kioskSentOrderIdRef.current === orderId) {
            kioskSentOrderIdRef.current = null;
            setKioskSentOrder(null);
          }
        },
      ),

      // KIOSK rejected the order (or POS cancelled before KIOSK acted) — clear banner
      orderEventBus.subscribe(
        "ORDER_CANCELLED",
        (msg: WsMessage<{ orderId: string }>) => {
          const { orderId } = msg.payload;
          if (kioskSentOrderIdRef.current === orderId) {
            kioskSentOrderIdRef.current = null;
            setKioskSentOrder(null);
          }
        },
      ),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
      orderWebSocketService.disconnect();
    };
  }, [navigate]);

  function sendToKiosk(items: CartItem[], targetKioskId?: string) {
    orderWebSocketService.sendToKiosk(toLineItems(items), targetKioskId);
  }

  function claimOrder(orderId: string) {
    orderWebSocketService.claimOrder(orderId);
  }

  function updateOrder(orderId: string, items: CartItem[]) {
    orderWebSocketService.updateOrder(orderId, toLineItems(items));
  }

  function completeOrder(orderId: string, method: PaymentMethod) {
    orderWebSocketService.completeOrder(orderId, method);
    // Modal will open when ORDER_COMPLETED WS event fires back
  }

  async function completeDirectOrder(items: CartItem[], method: PaymentMethod) {
    const terminalId = orderWebSocketService.getTerminalId() || "POS-1";
    const lineItems = toLineItems(items);
    const order = await invoke<Order>("complete_pos_order", {
      items: lineItems,
      paymentMethod: method,
      terminalId,
    });
    setLastCompletedOrder(order);
  }

  function releaseOrder(orderId: string) {
    orderWebSocketService.releaseOrder(orderId);
    setActiveOrder(null);
    heldOrderService.delete(orderId).catch(() => {});
  }

  function stashWalkupCart(items: CartItem[]) {
    walkupCartRef.current = items;
  }

  function popWalkupCart(): CartItem[] {
    const items = walkupCartRef.current;
    walkupCartRef.current = [];
    return items;
  }

  function clearActiveOrder() {
    setActiveOrder(null);
  }

  function resumeHeldOrder(order: Order) {
    // Hold the current active order before switching
    if (
      activeOrderRef.current &&
      activeOrderRef.current.orderId !== order.orderId
    ) {
      heldOrderService.save(activeOrderRef.current).catch(console.error);
    }
    // Remove the resumed order from hold and make it active
    heldOrderService.delete(order.orderId).catch(console.error);
    setActiveOrder(order);
    navigate("/");
  }

  return (
    <OrderContext.Provider
      value={{
        activeOrder,
        kioskAcceptedAt,
        kioskSentOrder,
        clearKioskSentOrder: () => setKioskSentOrder(null),
        incomingOrders,
        isConnected,
        notification,
        lastCompletedOrder,
        clearNotification: () => setNotification(null),
        clearCompletedOrder: () => setLastCompletedOrder(null),
        sendToKiosk,
        claimOrder,
        stashWalkupCart,
        popWalkupCart,
        resumeHeldOrder,
        clearActiveOrder,
        updateOrder,
        completeOrder,
        completeDirectOrder,
        releaseOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used inside OrderProvider");
  return ctx;
}
