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
import { useNotification } from "@/context/NotificationContext";
import orderSoundUrl from "@/assets/mixkit-clear-announce-tones-2861.wav";

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
  /** Order IDs that completed via POS→KIOSK transfer (session-scoped) */
  posSentToKioskCompletedIds: Set<string>;
  /** Order IDs that completed via KIOSK→POS transfer (KIOSK requested help, POS completed) */
  kioskToPosTransferCompletedIds: Set<string>;
  /** Order IDs that completed via KIOSK→POS→KIOSK transfer (customer moved to POS then back) */
  kioskToPosToKioskCompletedIds: Set<string>;
  sendToKiosk: (items: CartItem[], targetKioskId?: string) => void;
  /** Call before orderWebSocketService.pullKioskCart() to enable auto-claim */
  preparePullClaim: () => void;
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
  addItemToOrder: (orderId: string, item: OrderLineItem) => void;
  removeItemFromOrder: (orderId: string, productId: string) => void;
  changeItemQty: (orderId: string, productId: string, qty: number) => void;
  applyOrderDiscount: (orderId: string, amount: number) => void;
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
  const { showNotification } = useNotification();
  const showNotificationRef = useRef(showNotification);
  showNotificationRef.current = showNotification;

  const orderSoundRef = useRef<HTMLAudioElement | null>(null);
  if (!orderSoundRef.current) {
    orderSoundRef.current = new Audio(orderSoundUrl);
    orderSoundRef.current.volume = 0.7;
  }

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

  // All order IDs POS has sent to KIOSK (tracks from first ORDER_UPDATED confirmation)
  const posSentToKioskIdsRef = useRef<Set<string>>(new Set());

  // Order IDs sent to KIOSK while POS was handling a KIOSK assistance order (KIOSK→POS→KIOSK)
  const kioskToPosToKioskIdsRef = useRef<Set<string>>(new Set());

  // Flag set synchronously before sendToKiosk WS message fires, so ORDER_UPDATED can detect the pattern
  const sendToKioskWasAssistanceRef = useRef(false);

  // Completed orders that went through POS→KIOSK transfer (session-persisted)
  const [posSentToKioskCompletedIds, setPosSentToKioskCompletedIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem("pos_kiosk_completed_ids");
      return stored ? new Set<string>(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Completed orders that went through KIOSK→POS transfer (KIOSK requested help, this POS completed)
  const [kioskToPosTransferCompletedIds, setKioskToPosTransferCompletedIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem("kiosk_pos_completed_ids");
      return stored ? new Set<string>(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Completed orders that went through KIOSK→POS→KIOSK transfer
  const [kioskToPosToKioskCompletedIds, setKioskToPosToKioskCompletedIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem("kiosk_pos_kiosk_completed_ids");
      return stored ? new Set<string>(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Stash for walk-up cart items saved on MenuSelection unmount
  const walkupCartRef = useRef<CartItem[]>([]);

  // Set true after POS sends PULL_KIOSK_CART — auto-claims next ORDER_AVAILABLE
  const pendingPullClaimRef = useRef(false);

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
          const incoming = msg.payload.order;

          // Auto-claim if this arrived in response to a Pull Kiosk Cart action
          if (pendingPullClaimRef.current) {
            pendingPullClaimRef.current = false;
            orderWebSocketService.claimOrder(incoming.orderId);
            return; // CLAIM_ACK handler will set activeOrder
          }

          setIncomingOrders((prev) => {
            const already = prev.some((o) => o.orderId === incoming.orderId);
            if (!already) {
              showNotificationRef.current.info(
                `New incoming order #${incoming.orderNumber}`,
                5000,
              );
              orderSoundRef.current?.play().catch(() => {});
            }
            return already ? prev : [...prev, incoming];
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
              posSentToKioskIdsRef.current.add(updated.orderId);
              // If sent while handling a KIOSK assistance order → KIOSK→POS→KIOSK
              if (sendToKioskWasAssistanceRef.current) {
                kioskToPosToKioskIdsRef.current.add(updated.orderId);
                sendToKioskWasAssistanceRef.current = false;
              }
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
          const completed = msg.payload.order;
          const wasMyActiveOrder = activeOrderRef.current?.orderId === completed.orderId;
          if (wasMyActiveOrder) {
            setLastCompletedOrder(completed);
            // KIOSK→POS transfer: this POS had the order active and completed it,
            // and the order originally came from a KIOSK (assistance request)
            if (completed.originTerminal.type === "KIOSK") {
              setKioskToPosTransferCompletedIds((prev) => {
                const next = new Set(prev);
                next.add(completed.orderId);
                try {
                  sessionStorage.setItem("kiosk_pos_completed_ids", JSON.stringify([...next]));
                } catch {}
                return next;
              });
            }
            setActiveOrder(null);
          }
          // Track if this was a POS→KIOSK or KIOSK→POS→KIOSK transferred order
          if (posSentToKioskIdsRef.current.has(completed.orderId)) {
            posSentToKioskIdsRef.current.delete(completed.orderId);
            if (kioskToPosToKioskIdsRef.current.has(completed.orderId)) {
              // KIOSK→POS→KIOSK transfer completed
              kioskToPosToKioskIdsRef.current.delete(completed.orderId);
              setKioskToPosToKioskCompletedIds((prev) => {
                const next = new Set(prev);
                next.add(completed.orderId);
                try {
                  sessionStorage.setItem("kiosk_pos_kiosk_completed_ids", JSON.stringify([...next]));
                } catch {}
                return next;
              });
            } else {
              // Regular POS→KIOSK transfer completed
              setPosSentToKioskCompletedIds((prev) => {
                const next = new Set(prev);
                next.add(completed.orderId);
                try {
                  sessionStorage.setItem("pos_kiosk_completed_ids", JSON.stringify([...next]));
                } catch {}
                return next;
              });
            }
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

  /** Set the auto-claim flag before sending PULL_KIOSK_CART */
  function preparePullClaim() {
    pendingPullClaimRef.current = true;
  }

  function sendToKiosk(items: CartItem[], targetKioskId?: string) {
    // Flag before the WS message so ORDER_UPDATED can detect the transfer pattern
    if (activeOrderRef.current?.originTerminal.type === "KIOSK") {
      sendToKioskWasAssistanceRef.current = true;
    }
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

  function addItemToOrder(orderId: string, item: OrderLineItem) {
    orderWebSocketService.addItem(orderId, item);
  }

  function removeItemFromOrder(orderId: string, productId: string) {
    orderWebSocketService.removeItem(orderId, productId);
  }

  function changeItemQty(orderId: string, productId: string, qty: number) {
    orderWebSocketService.changeQty(orderId, productId, qty);
  }

  function applyOrderDiscount(orderId: string, amount: number) {
    orderWebSocketService.applyDiscount(orderId, amount);
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
        posSentToKioskCompletedIds,
        kioskToPosTransferCompletedIds,
        kioskToPosToKioskCompletedIds,
        incomingOrders,
        isConnected,
        notification,
        lastCompletedOrder,
        clearNotification: () => setNotification(null),
        clearCompletedOrder: () => setLastCompletedOrder(null),
        sendToKiosk,
        preparePullClaim,
        claimOrder,
        stashWalkupCart,
        popWalkupCart,
        resumeHeldOrder,
        clearActiveOrder,
        updateOrder,
        completeOrder,
        completeDirectOrder,
        releaseOrder,
        addItemToOrder,
        removeItemFromOrder,
        changeItemQty,
        applyOrderDiscount,
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
