import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { QueueToken } from "@/types/queue";
import { localEventBus, LocalEventTypes } from "@/services/eventbus/LocalEventBus";
import { getQueueWsUrl, getQueueTerminalId } from "@/services/queue/queueConnectionConfig";
import { queueTokenLocal } from "@/services/queue/queueToken.local.service";

interface QueueWsContextType {
  tokens: QueueToken[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (url: string) => void;
  disconnect: () => void;
}

const QueueWsContext = createContext<QueueWsContextType | undefined>(undefined);

export function QueueWebSocketProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load active tokens from SQLite on mount
  useEffect(() => {
    queueTokenLocal.getActiveTokens().then(setTokens);
  }, []);

  const handleMessage = useCallback((msg: any) => {
    const type = msg.type ?? msg.message_type;
    const payload = msg.payload ?? {};

    switch (type) {
      case "IDENTIFIED": {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        break;
      }

      case "ORDER_AVAILABLE": {
        const order = payload.order ?? payload;
        const tokenNumber: number =
          order.token_number ?? order.tokenNumber ?? order.order_number ?? 0;
        if (!tokenNumber) break;

        const token: QueueToken = {
          id: order.order_id ?? order.id ?? String(Date.now()),
          ticketId: order.order_id ?? null,
          ticketNumber: String(order.order_number ?? ""),
          tokenNumber,
          status: "WAITING",
          source: order.origin_type ?? null,
          orderMode: order.origin_type ?? null,
          createdAt: new Date(order.created_at ?? Date.now()).toISOString(),
          calledAt: null,
          servedAt: null,
        };

        queueTokenLocal.saveToken(token).catch(() => {});

        setTokens((prev) => {
          if (prev.some((t) => t.tokenNumber === token.tokenNumber)) return prev;
          localEventBus.emit(LocalEventTypes.QUEUE_UPDATED, { tokenNumber });
          return [...prev, token];
        });
        break;
      }

      case "queue_call": {
        const tokenNumber: number = payload.token_number ?? payload.tokenNumber;
        if (!tokenNumber) break;

        queueTokenLocal.updateStatus(tokenNumber, "CALLED").catch(() => {});

        setTokens((prev) => {
          const next = prev.map((t) =>
            t.tokenNumber === tokenNumber
              ? { ...t, status: "CALLED" as const, calledAt: new Date().toISOString() }
              : t,
          );
          localEventBus.emit(LocalEventTypes.QUEUE_TOKEN_CALLED, { tokenNumber });
          return next;
        });
        break;
      }

      case "queue_served": {
        const tokenNumber: number = payload.token_number ?? payload.tokenNumber;
        if (!tokenNumber) break;

        queueTokenLocal.updateStatus(tokenNumber, "SERVED").catch(() => {});

        setTokens((prev) => {
          const next = prev.filter((t) => t.tokenNumber !== tokenNumber);
          localEventBus.emit(LocalEventTypes.QUEUE_TOKEN_SERVED, { tokenNumber });
          return next;
        });
        break;
      }

      case "ORDER_COMPLETED":
      case "ORDER_CANCELLED":
      case "ORDER_EXPIRED": {
        const orderId = payload.order_id ?? payload.orderId;
        if (!orderId) break;

        setTokens((prev) => {
          const token = prev.find((t) => t.ticketId === orderId);
          if (token) {
            queueTokenLocal.updateStatus(token.tokenNumber, "SERVED").catch(() => {});
            localEventBus.emit(LocalEventTypes.QUEUE_TOKEN_SERVED, {
              tokenNumber: token.tokenNumber,
            });
          }
          return prev.filter((t) => t.ticketId !== orderId);
        });
        break;
      }

      case "state_sync": {
        const syncTokens: QueueToken[] = (payload.tokens ?? []).map((t: any) => ({
          id: t.id ?? String(Date.now()),
          ticketId: t.ticket_id ?? t.ticketId ?? null,
          ticketNumber: t.ticket_number ?? t.ticketNumber ?? null,
          tokenNumber: t.token_number ?? t.tokenNumber,
          status: t.status ?? "WAITING",
          source: t.source ?? null,
          orderMode: t.order_mode ?? t.orderMode ?? null,
          createdAt: t.created_at ?? t.createdAt ?? new Date().toISOString(),
          calledAt: t.called_at ?? t.calledAt ?? null,
          servedAt: t.served_at ?? t.servedAt ?? null,
        }));
        setTokens(syncTokens);
        localEventBus.emit(LocalEventTypes.QUEUE_UPDATED, {});
        break;
      }

      case "workday_started":
      case "workday_ended": {
        setTokens([]);
        localEventBus.emit(LocalEventTypes.QUEUE_UPDATED, {});
        break;
      }
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
          const terminalId = await getQueueTerminalId();
          ws.send(
            JSON.stringify({
              type: "IDENTIFY",
              payload: { terminalId, type: "QUEUE" },
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
    getQueueWsUrl().then((savedUrl) => {
      if (savedUrl) connect(savedUrl);
    });
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return (
    <QueueWsContext.Provider
      value={{ tokens, isConnected, isConnecting, error, connect, disconnect }}
    >
      {children}
    </QueueWsContext.Provider>
  );
}

export function useQueueWebSocket() {
  const ctx = useContext(QueueWsContext);
  if (!ctx) throw new Error("useQueueWebSocket must be used within QueueWebSocketProvider");
  return ctx;
}
