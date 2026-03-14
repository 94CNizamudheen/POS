import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { localEventBus, LocalEventTypes } from "@/services/eventbus/LocalEventBus";
import {
  getCdWsUrl,
  getCdTerminalId,
} from "@/services/customer-display/customerDisplayConnectionConfig";

interface CustomerDisplayWsContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (url: string) => void;
  disconnect: () => void;
}

const CustomerDisplayWsContext = createContext<CustomerDisplayWsContextType | undefined>(
  undefined,
);

export function CustomerDisplayWebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const handleMessage = useCallback((msg: any) => {
    const type = msg.type ?? msg.message_type;
    const payload = msg.payload ?? {};

    switch (type) {
      case "IDENTIFIED":
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        break;
      case "customer_display_cart_update":
        localEventBus.emit(LocalEventTypes.CUSTOMER_DISPLAY_CART_UPDATE, payload);
        break;
      case "customer_display_order_complete":
        localEventBus.emit(LocalEventTypes.CUSTOMER_DISPLAY_ORDER_COMPLETE, payload);
        break;
      case "customer_display_clear":
        localEventBus.emit(LocalEventTypes.CUSTOMER_DISPLAY_CLEAR, {});
        break;
      case "customer_display_branding_update":
        localEventBus.emit(LocalEventTypes.CUSTOMER_DISPLAY_BRANDING_UPDATE, payload);
        break;
    }
  }, []);

  const connect = useCallback(
    (url: string) => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnecting(true);
      setError(null);

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = async () => {
          const terminalId = await getCdTerminalId();
          ws.send(
            JSON.stringify({
              type: "IDENTIFY",
              payload: { terminalId, type: "CUSTOMER_DISPLAY" },
              timestamp: Date.now(),
              messageId: `${terminalId}-${Date.now()}`,
            }),
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            handleMessage(msg);
          } catch {}
        };

        ws.onerror = () => {
          setIsConnecting(false);
          setIsConnected(false);
          setError("Connection failed. Check the URL and try again.");
        };

        ws.onclose = () => {
          setIsConnected(false);
          setIsConnecting(false);
        };
      } catch {
        setIsConnecting(false);
        setError("Invalid WebSocket URL.");
      }
    },
    [handleMessage],
  );

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Auto-connect on mount if URL is saved
  useEffect(() => {
    getCdWsUrl().then((savedUrl) => {
      if (savedUrl) connect(savedUrl);
    });
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return (
    <CustomerDisplayWsContext.Provider
      value={{ isConnected, isConnecting, error, connect, disconnect }}
    >
      {children}
    </CustomerDisplayWsContext.Provider>
  );
}

export function useCustomerDisplayWebSocket() {
  const ctx = useContext(CustomerDisplayWsContext);
  if (!ctx)
    throw new Error(
      "useCustomerDisplayWebSocket must be used within CustomerDisplayWebSocketProvider",
    );
  return ctx;
}
