import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Order, WsMessage, OrderLineItem } from "@/types/order";
import type { CartItem } from "@/UI/components/menu-selection/CartSidebar";
import { orderEventBus } from "@/services/kiosk/orderWebSocket/orderEventBus";
import { orderWebSocketService } from "@/services/kiosk/orderWebSocket/orderWebSocket.service";
import * as orderDb from "@/services/kiosk/orderDb.service";
import { getPosUrl, getTerminalId } from "@/services/kiosk/connectionConfig";
import { orderAssignedBridge } from "@/services/kiosk/orderAssignedBridge";

interface OrderContextValue {
  activeOrder: Order | null;
  /** Set when POS assigns an order to this KIOSK — cleared once customer dismisses */
  posAssignedOrder: Order | null;
  clearPosAssignedOrder: () => void;
  clearActiveOrder: () => void;
  isConnected: boolean;
  /** True when cashier released the order back to the customer (Option A) */
  assistanceHandedBack: boolean;
  clearAssistanceHandedBack: () => void;
  /** Stay-at-kiosk assistance: cashier helps remotely, watermark shown */
  requestAssistance: (items: CartItem[]) => void;
  /** Move-to-POS assistance: kiosk clears immediately, POS handles order, can send back later */
  requestMoveToPOS: (items: CartItem[]) => void;
  /** Set once the server confirms the order number after "Move to POS" — shown to customer */
  movedToPosOrder: Order | null;
  clearMovedToPosOrder: () => void;
  updateOrder: (orderId: string, items: CartItem[]) => void;
  releaseOrder: (orderId: string) => void;
  claimOrder: (orderId: string) => void;
  /** Accept a POS-sent order — transitions it from PENDING_KIOSK to TRANSFERRED */
  acceptOrder: (orderId: string) => void;
  /** Complete KIOSK payment — sends order to POS DB and navigates to /kiosk/confirmed */
  completeKioskOrder: (
    orderId: string | null,
    items: CartItem[],
    method: string,
  ) => void;
  /** Restore a locally-stored order from DB (customer returned and typed their order number) */
  resumeOrderFromDb: (order: Order) => void;
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
  const [posAssignedOrder, setPosAssignedOrder] = useState<Order | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [assistanceHandedBack, setAssistanceHandedBack] = useState(false);
  const [movedToPosOrder, setMovedToPosOrder] = useState<Order | null>(null);

  // Keep refs so event handlers can read current values without stale closures
  const activeOrderRef = useRef<Order | null>(null);
  activeOrderRef.current = activeOrder;
  const posAssignedOrderRef = useRef<Order | null>(null);
  posAssignedOrderRef.current = posAssignedOrder;

  // Tracks orderId of in-flight KIOSK_COMPLETE_ORDER for POS→KIOSK flow
  const pendingKioskCompletionRef = useRef<string | null>(null);

  // Set true when customer chose "Move to POS" — suppresses activeOrder on ORDER_AVAILABLE
  const movedToPosRef = useRef(false);

  // Persisted set of Order IDs the customer moved to POS with.
  // Used to: (a) skip them in IDENTIFIED reconciliation, (b) tag ORDER_ASSIGNED as KIOSK_TRANSFER.
  const movedToPosOrderIdsRef = useRef<Set<string>>(
    (() => {
      try {
        const s = sessionStorage.getItem("kiosk_moved_to_pos_ids");
        return s
          ? new Set<string>(JSON.parse(s) as string[])
          : new Set<string>();
      } catch {
        return new Set<string>();
      }
    })(),
  );

  // Register the bridge so AppContext can trigger activeOrder + PosOrderBanner
  // when ORDER_ASSIGNED arrives in SAME-position mode.
  orderAssignedBridge.register((order) => {
    setActiveOrder(order);
    setPosAssignedOrder(order);
    navigate("/kiosk/menu");
  });

  function persistMovedToPosIds() {
    try {
      sessionStorage.setItem(
        "kiosk_moved_to_pos_ids",
        JSON.stringify([...movedToPosOrderIdsRef.current]),
      );
    } catch {}
  }

  useEffect(() => {
    // Boot WS connection — config stored in DB, falls back to env vars
    Promise.all([getPosUrl(), getTerminalId()]).then(([posUrl, terminalId]) => {
      orderWebSocketService.init(posUrl, terminalId, "KIOSK");
    });
    orderWebSocketService.onConnectionChange(setIsConnected);

    // ── Event subscriptions ──────────────────────────────────────────────────

    const unsubs = [
      // On reconnect: reconcile active orders
      orderEventBus.subscribe(
        "IDENTIFIED",
        (msg: WsMessage<{ activeOrders: Order[] }>) => {
          setIsConnected(true);
          const myId = orderWebSocketService.getTerminalId();
          const mine = msg.payload.activeOrders.find(
            (o) =>
              (o.originTerminal.terminalId === myId ||
                o.ownerTerminal?.terminalId === myId) &&
              // Skip orders the customer already moved to POS — they'll come back
              // as KIOSK_TRANSFER via ORDER_ASSIGNED when POS sends them back.
              !movedToPosOrderIdsRef.current.has(o.orderId),
          );
          setActiveOrder(mine ?? null);
        },
      ),

      // KIOSK sent REQUEST_ASSISTANCE → server confirms order created
      orderEventBus.subscribe(
        "ORDER_AVAILABLE",
        (msg: WsMessage<{ order: Order }>) => {
          const myId = orderWebSocketService.getTerminalId();
          if (msg.payload.order.originTerminal.terminalId === myId) {
            orderDb.upsertOrder(msg.payload.order);
            if (movedToPosRef.current) {
              // Customer chose "Move to POS" — store orderId so we can:
              // 1. Skip it in IDENTIFIED reconnect
              // 2. Tag the POS "send back" order as KIOSK_TRANSFER
              movedToPosRef.current = false;
              movedToPosOrderIdsRef.current.add(msg.payload.order.orderId);
              persistMovedToPosIds();
              setMovedToPosOrder(msg.payload.order);
              return;
            }
            setActiveOrder(msg.payload.order);
            setAssistanceHandedBack(false); // reset for new session
          }
        },
      ),

      // POS sent order to this KIOSK — store in local DB only.
      // If there are pending moved-to-POS orders, this is a KIOSK→POS→KIOSK
      // transfer: re-tag the order's originTerminal as "KIOSK_TRANSFER" so
      // AssistanceBanner and other checks can distinguish it.
      orderEventBus.subscribe(
        "ORDER_ASSIGNED",
        (msg: WsMessage<{ order: Order }>) => {
          const order = msg.payload.order;
          if (movedToPosOrderIdsRef.current.size > 0) {
            // This is a KIOSK→POS→KIOSK transfer — tag and clean up tracking
            const [firstMovedId] = movedToPosOrderIdsRef.current;
            movedToPosOrderIdsRef.current.delete(firstMovedId);
            persistMovedToPosIds();
            const taggedOrder: Order = {
              ...order,
              originTerminal: {
                ...order.originTerminal,
                type: "KIOSK_TRANSFER",
              },
            };
            orderDb.upsertOrder(taggedOrder).catch(console.error);
          } else {
            orderDb.upsertOrder(order).catch(console.error);
          }
        },
      ),

      // Order updated (POS editing items, status change, etc.)
      // Note: POS cancel / KIOSK reject are handled via ORDER_CANCELLED, not here.
      orderEventBus.subscribe(
        "ORDER_UPDATED",
        (msg: WsMessage<{ order: Order }>) => {
          const updated = msg.payload.order;
          orderDb.upsertOrder(updated);

          setActiveOrder((prev) => {
            // Detect cashier releasing order back to customer (Option A)
            if (
              prev?.orderId === updated.orderId &&
              prev.ownerTerminal !== null &&
              updated.ownerTerminal === null
            ) {
              setAssistanceHandedBack(true);
            }
            return prev?.orderId === updated.orderId ? updated : prev;
          });
          // Keep posAssignedOrder in sync (items may be updated by POS)
          setPosAssignedOrder((prev) =>
            prev?.orderId === updated.orderId ? updated : prev,
          );
        },
      ),

      // Order completed — navigate to /kiosk/confirmed with real order data
      orderEventBus.subscribe(
        "ORDER_COMPLETED",
        (msg: WsMessage<{ order: Order }>) => {
          const { order } = msg.payload;
          orderDb.upsertOrder(order);

          const myId = orderWebSocketService.getTerminalId();
          const isMyCompletion =
            // Self-service: this KIOSK originated the order
            order.originTerminal.terminalId === myId ||
            // POS→KIOSK flow: we tracked the orderId we were completing
            pendingKioskCompletionRef.current === order.orderId;

          if (isMyCompletion) {
            pendingKioskCompletionRef.current = null;
            setActiveOrder(null);
            navigate("/kiosk/confirmed", {
              state: {
                orderId: order.orderId,
                orderNumber: order.orderNumber,
                total: order.total,
              },
            });
          }
        },
      ),

      // Order expired without action
      orderEventBus.subscribe(
        "ORDER_EXPIRED",
        (msg: WsMessage<{ orderId: string }>) => {
          const { orderId } = msg.payload;
          orderDb.updateOrderStatus(orderId, "EXPIRED");
          if (posAssignedOrderRef.current?.orderId === orderId) {
            setPosAssignedOrder(null);
          }
          if (activeOrderRef.current?.orderId === orderId) {
            setActiveOrder(null);
            setTimeout(() => navigate("/kiosk"), 5000);
          }
        },
      ),

      // Order cancelled (POS recalled or KIOSK rejected before acceptance)
      // Always remove from local DB — it was never truly transferred
      orderEventBus.subscribe(
        "ORDER_CANCELLED",
        (msg: WsMessage<{ orderId: string }>) => {
          const { orderId } = msg.payload;
          // Clean up moved-to-POS tracking if this was an assistance order
          if (movedToPosOrderIdsRef.current.has(orderId)) {
            movedToPosOrderIdsRef.current.delete(orderId);
            persistMovedToPosIds();
          }
          orderDb.deleteOrder(orderId);
          if (posAssignedOrderRef.current?.orderId === orderId) {
            setPosAssignedOrder(null);
            setActiveOrder(null);
            navigate("/kiosk");
          }
        },
      ),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
      orderWebSocketService.disconnect();
    };
  }, [navigate]);

  function requestAssistance(items: CartItem[]) {
    orderWebSocketService.requestAssistance(toLineItems(items));
  }

  function requestMoveToPOS(items: CartItem[]) {
    // Flag so ORDER_AVAILABLE suppresses activeOrder — we navigate away immediately
    movedToPosRef.current = true;
    orderWebSocketService.requestAssistance(toLineItems(items));
  }

  function updateOrder(orderId: string, items: CartItem[]) {
    orderWebSocketService.updateOrder(orderId, toLineItems(items));
  }

  function releaseOrder(orderId: string) {
    orderWebSocketService.releaseOrder(orderId);
    setActiveOrder(null);
  }

  function claimOrder(orderId: string) {
    orderWebSocketService.claimOrder(orderId);
  }

  function acceptOrder(orderId: string) {
    // Send acceptance to server (PENDING_KIOSK → TRANSFERRED).
    // Do NOT clear activeOrder here — the customer may still be adding items
    // and Menu.tsx needs it to sync cart changes and pass orderId to payment.
    orderWebSocketService.acceptKioskOrder(orderId);
  }

  function resumeOrderFromDb(order: Order) {
    setActiveOrder(order);
    // Always show PosOrderBanner so the customer can review items regardless
    // of order status — covers both PENDING_KIOSK (POS sent) and TRANSFERRED
    // (assistance order released back from cashier).
    setPosAssignedOrder(order);
  }

  function completeKioskOrder(
    orderId: string | null,
    items: CartItem[],
    method: string,
  ) {
    if (orderId) {
      // Track so ORDER_COMPLETED handler knows this is our completion
      pendingKioskCompletionRef.current = orderId;
    }
    orderWebSocketService.completeKioskOrder(
      orderId,
      toLineItems(items),
      method,
    );
  }

  return (
    <OrderContext.Provider
      value={{
        activeOrder,
        posAssignedOrder,
        clearPosAssignedOrder: () => setPosAssignedOrder(null),
        clearActiveOrder: () => setActiveOrder(null),
        isConnected,
        assistanceHandedBack,
        clearAssistanceHandedBack: () => setAssistanceHandedBack(false),
        requestAssistance,
        requestMoveToPOS,
        movedToPosOrder,
        clearMovedToPosOrder: () => setMovedToPosOrder(null),
        updateOrder,
        releaseOrder,
        claimOrder,
        acceptOrder,
        completeKioskOrder,
        resumeOrderFromDb,
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
