import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import type { Order, WsMessage, OrderLineItem, PaymentMethod } from "@/types/order";
import type { CartItem } from "@/UI/components/CartSidebar";
import { orderEventBus } from "@/services/orderWebSocket/orderEventBus";
import { orderWebSocketService } from "@/services/orderWebSocket/orderWebSocket.service";

interface OrderContextValue {
  activeOrder: Order | null;
  incomingOrders: Order[];
  isConnected: boolean;
  notification: string | null;
  lastCompletedOrder: Order | null;
  clearNotification: () => void;
  clearCompletedOrder: () => void;
  sendToKiosk: (items: CartItem[], targetKioskId?: string) => void;
  claimOrder: (orderId: string) => void;
  updateOrder: (orderId: string, items: CartItem[]) => void;
  completeOrder: (orderId: string, method: PaymentMethod) => void;
  completeDirectOrder: (items: CartItem[], method: PaymentMethod) => Promise<void>;
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

  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);

  const activeOrderRef = useRef<Order | null>(null);
  activeOrderRef.current = activeOrder;

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
            (o) => o.status === "TRANSFERRED" && o.originTerminal.type === "KIOSK",
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
            const already = prev.some((o) => o.orderId === msg.payload.order.orderId);
            return already ? prev : [...prev, msg.payload.order];
          });
        },
      ),

      // This POS successfully claimed an order
      orderEventBus.subscribe(
        "CLAIM_ACK",
        (msg: WsMessage<{ order: Order }>) => {
          const order = msg.payload.order;
          setActiveOrder(order);
          setIncomingOrders((prev) => prev.filter((o) => o.orderId !== order.orderId));
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
          setActiveOrder((prev) =>
            prev?.orderId === updated.orderId ? updated : prev,
          );
          // Remove from incoming if it's now claimed
          if (updated.ownerTerminal) {
            setIncomingOrders((prev) => prev.filter((o) => o.orderId !== updated.orderId));
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
          setIncomingOrders((prev) => prev.filter((o) => o.orderId !== orderId));
          if (activeOrderRef.current?.orderId === orderId) {
            setActiveOrder(null);
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
  }

  return (
    <OrderContext.Provider
      value={{
        activeOrder,
        incomingOrders,
        isConnected,
        notification,
        lastCompletedOrder,
        clearNotification: () => setNotification(null),
        clearCompletedOrder: () => setLastCompletedOrder(null),
        sendToKiosk,
        claimOrder,
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
