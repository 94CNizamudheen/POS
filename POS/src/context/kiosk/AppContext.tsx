import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { orderEventBus } from "@/services/kiosk/orderWebSocket/orderEventBus";
import { orderWebSocketService } from "@/services/kiosk/orderWebSocket/orderWebSocket.service";
import type { WsMessage, Order } from "@/types/order";
import { orderAssignedBridge } from "@/services/kiosk/orderAssignedBridge";
import type { CartItem } from "@/types/product";

export type KioskPosition = "SAME" | "DISTANCE";

interface AppContextValue {
  /** Physical position of this KIOSK relative to the POS counter */
  position: KioskPosition;
  setPosition: (p: KioskPosition) => Promise<void>;
  /**
   * Call this from Menu.tsx whenever the cart changes so
   * PULL_KIOSK_CART always sees the latest items.
   */
  syncCart: (items: CartItem[]) => void;
}

const AppContext = createContext<AppContextValue>({
  position: "DISTANCE",
  setPosition: async () => {},
  syncCart: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [position, setPositionState] = useState<KioskPosition>("DISTANCE");

  // Keep position in a ref so event handlers always read the latest value
  const positionRef = useRef(position);
  positionRef.current = position;

  // Holds the latest KIOSK cart — updated by Menu.tsx on every cart change
  const currentCartRef = useRef<CartItem[]>([]);

  // Load persisted position on mount
  useEffect(() => {
    invoke<string | null>("get_app_state", { key: "position" })
      .then((v) => {
        if (v === "SAME" || v === "DISTANCE") setPositionState(v as KioskPosition);
      })
      .catch(console.error);
  }, []);

  async function setPosition(p: KioskPosition) {
    setPositionState(p);
    await invoke("set_app_state", { key: "position", value: p });
  }

  const syncCart = useCallback((items: CartItem[]) => {
    currentCartRef.current = items;
  }, []);

  useEffect(() => {
    const unsubs = [
      // POS instructed this KIOSK to wipe its local DB
      orderEventBus.subscribe(
        "CLEAR_KIOSK_DATA",
        (msg: WsMessage<{ targetKioskId: string | null }>) => {
          const myId = orderWebSocketService.getTerminalId();
          const target = msg.payload.targetKioskId;
          if (target === null || target === myId) {
            invoke("clear_all_data").catch(console.error);
            navigate("/kiosk");
          }
        },
      ),

      // POS pushed an order to this KIOSK
      // SAME position: auto-navigate to menu so the customer can continue immediately
      orderEventBus.subscribe(
        "ORDER_ASSIGNED",
        (msg: WsMessage<{ order: Order }>) => {
          if (positionRef.current === "SAME") {
            orderAssignedBridge.trigger(msg.payload.order);
          }
          // DISTANCE: OrderContext handles storage silently, customer types number
        },
      ),

      // POS requested KIOSK cart (side-by-side pull)
      orderEventBus.subscribe(
        "PULL_KIOSK_CART",
        (msg: WsMessage<{ targetKioskId: string }>) => {
          const myId = orderWebSocketService.getTerminalId();
          if (msg.payload.targetKioskId !== myId) return;
          const items = currentCartRef.current;
          if (items.length === 0) return;
          orderWebSocketService.requestAssistance(
            items.map((i) => ({
              productId: i.id,
              name: i.name,
              price: i.price,
              qty: i.qty,
              subtotal: i.price * i.qty,
            })),
          );
        },
      ),
    ];

    return () => unsubs.forEach((fn) => fn());
  }, [navigate]);

  return (
    <AppContext.Provider value={{ position, setPosition, syncCart }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
