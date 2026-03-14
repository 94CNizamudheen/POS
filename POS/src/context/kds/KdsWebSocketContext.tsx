import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { KDSTicket, KDSTicketItem } from "@/types/kds";
import { localEventBus, LocalEventTypes } from "@/services/eventbus/LocalEventBus";
import { getKdsWsUrl, getKdsTerminalId } from "@/services/kds/kdsConnectionConfig";
import { kdsTicketLocal } from "@/services/kds/kdsTicket.local.service";

interface KdsWsContextType {
  tickets: KDSTicket[];
  completedTickets: KDSTicket[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (url: string) => void;
  disconnect: () => void;
  toggleItem: (ticketId: string, itemId: string) => void;
  markTicketDone: (ticketId: string) => void;
}

const KdsWsContext = createContext<KdsWsContextType | undefined>(undefined);

function mapOrderToTicket(order: any): KDSTicket | null {
  try {
    const items: any[] =
      typeof order.items_json === "string"
        ? JSON.parse(order.items_json)
        : (order.items_json ?? []);

    const ticketItems: KDSTicketItem[] = items.map((item: any) => ({
      id: item.product_id ?? item.id ?? String(Math.random()),
      name: item.name ?? "Item",
      quantity: item.quantity ?? 1,
      notes: item.notes ?? "",
      toggled: false,
    }));

    return {
      id: order.order_id,
      orderNumber: order.order_number,
      orderMode: order.origin_type ?? "POS",
      receivedTime: new Date(order.created_at ?? Date.now()).toISOString(),
      items: ticketItems,
      status: "PENDING",
      tableNumber: order.table_number,
      adminId: order.origin_terminal_id,
    };
  } catch {
    return null;
  }
}

export function KdsWebSocketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<KDSTicket[]>([]);
  const [completedTickets, setCompletedTickets] = useState<KDSTicket[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load active tickets from SQLite on mount
  useEffect(() => {
    kdsTicketLocal.getActiveTickets().then((rows) => {
      const loaded: KDSTicket[] = rows.map((r) => {
        let items: KDSTicketItem[] = [];
        try {
          items = JSON.parse(r.items);
        } catch {}
        return {
          id: r.id,
          orderNumber: r.ticketNumber,
          orderMode: r.orderModeName ?? "POS",
          receivedTime: r.createdAt,
          items,
          status: r.status,
          tableNumber: undefined,
          adminId: undefined,
        };
      });
      setTickets(loaded);
    });
  }, []);

  const handleMessage = useCallback((msg: any) => {
    const type = msg.type ?? msg.message_type;
    const payload = msg.payload ?? {};

    switch (type) {
      case "IDENTIFIED": {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        const orders: any[] = payload.orders ?? [];
        const activeStatuses = ["TRANSFERRED", "IN_PROGRESS", "PENDING_KIOSK"];
        const activeOrders = orders.filter((o) => activeStatuses.includes(o.status));

        setTickets((prev) => {
          const existingMap = new Map(prev.map((t) => [t.id, t]));
          const merged: KDSTicket[] = [];
          for (const order of activeOrders) {
            const ticket = mapOrderToTicket(order);
            if (!ticket) continue;
            const existing = existingMap.get(ticket.id);
            if (existing) {
              ticket.items = ticket.items.map((item) => {
                const existingItem = existing.items.find((i) => i.id === item.id);
                return existingItem ? { ...item, toggled: existingItem.toggled } : item;
              });
              ticket.status = existing.status;
            }
            merged.push(ticket);
            kdsTicketLocal.saveTicket({
              id: ticket.id,
              ticketNumber: ticket.orderNumber,
              orderId: ticket.id,
              orderModeName: ticket.orderMode,
              status: ticket.status,
              items: JSON.stringify(ticket.items),
              createdAt: ticket.receivedTime,
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          }
          return merged;
        });
        break;
      }

      case "ORDER_AVAILABLE": {
        const order = payload.order ?? payload;
        const ticket = mapOrderToTicket(order);
        if (!ticket) break;
        kdsTicketLocal.saveTicket({
          id: ticket.id,
          ticketNumber: ticket.orderNumber,
          orderId: ticket.id,
          orderModeName: ticket.orderMode,
          status: ticket.status,
          items: JSON.stringify(ticket.items),
          createdAt: ticket.receivedTime,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
        setTickets((prev) => {
          if (prev.some((t) => t.id === ticket.id)) return prev;
          localEventBus.emit(LocalEventTypes.TICKET_CREATED, { ticketId: ticket.id });
          return [...prev, ticket];
        });
        break;
      }

      case "ORDER_UPDATED": {
        const order = payload.order ?? payload;
        const ticket = mapOrderToTicket(order);
        if (!ticket) break;
        setTickets((prev) =>
          prev.map((t) => {
            if (t.id !== ticket.id) return t;
            ticket.items = ticket.items.map((item) => {
              const existing = t.items.find((i) => i.id === item.id);
              return existing ? { ...item, toggled: existing.toggled } : item;
            });
            return { ...ticket, status: t.status };
          }),
        );
        break;
      }

      case "ORDER_COMPLETED":
      case "ORDER_CANCELLED":
      case "ORDER_EXPIRED": {
        const orderId = payload.order_id ?? payload.orderId;
        if (!orderId) break;
        setTickets((prev) => {
          const ticket = prev.find((t) => t.id === orderId);
          if (ticket) {
            const completed = { ...ticket, status: "READY" as const };
            setCompletedTickets((cp) => [completed, ...cp].slice(0, 50));
            localEventBus.emit(LocalEventTypes.KDS_TICKET_REMOVED, { ticketId: orderId });
          }
          return prev.filter((t) => t.id !== orderId);
        });
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
          const terminalId = await getKdsTerminalId();
          ws.send(
            JSON.stringify({
              type: "IDENTIFY",
              payload: { terminalId, type: "KDS" },
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
    getKdsWsUrl().then((savedUrl) => {
      if (savedUrl) connect(savedUrl);
    });
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const toggleItem = useCallback((ticketId: string, itemId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        const items = t.items.map((item) =>
          item.id === itemId ? { ...item, toggled: !item.toggled } : item,
        );
        return { ...t, items };
      }),
    );
    localEventBus.emit(LocalEventTypes.KDS_ITEM_TOGGLED, { ticketId, itemId });
  }, []);

  const markTicketDone = useCallback((ticketId: string) => {
    kdsTicketLocal.updateStatus(ticketId, "READY").catch(() => {});
    setTickets((prev) => {
      const ticket = prev.find((t) => t.id === ticketId);
      if (ticket) {
        const completed = { ...ticket, status: "READY" as const };
        setCompletedTickets((cp) => [completed, ...cp].slice(0, 50));
        localEventBus.emit(LocalEventTypes.KDS_TICKET_REMOVED, { ticketId });
        localEventBus.emit(LocalEventTypes.KDS_STATUS_CHANGED, { ticketId, newStatus: "READY" });
      }
      return prev.filter((t) => t.id !== ticketId);
    });
  }, []);

  return (
    <KdsWsContext.Provider
      value={{
        tickets,
        completedTickets,
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
        toggleItem,
        markTicketDone,
      }}
    >
      {children}
    </KdsWsContext.Provider>
  );
}

export function useKdsWebSocket() {
  const ctx = useContext(KdsWsContext);
  if (!ctx) throw new Error("useKdsWebSocket must be used within KdsWebSocketProvider");
  return ctx;
}
