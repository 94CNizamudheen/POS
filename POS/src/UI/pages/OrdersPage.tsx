import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw } from "lucide-react";
import OrderCard from "../components/order/OrderCard";
import type { Order, OrderStatus } from "@/types/order";
import { useOrder } from "@/context/OrderContext";

type FilterTab = "ALL" | "ACTIVE" | "COMPLETED" | "EXPIRED" | "TRANSFERRED" | "KIOSK_TRANSFER";

const ACTIVE_STATUSES: OrderStatus[] = [
  "DRAFT",
  "TRANSFERRED",
  "IN_PROGRESS",
  "PAYMENT_PENDING",
];

export default function OrdersPage() {
  const { posSentToKioskCompletedIds, kioskToPosTransferCompletedIds, kioskToPosToKioskCompletedIds } = useOrder();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [loading, setLoading] = useState(true);

  async function fetchOrders() {
    setLoading(true);
    try {
      const result = await invoke<Order[]>("get_all_orders", { limit: 100 });
      setOrders(result);
    } catch (e) {
      console.error("Failed to load orders:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  function getTransferDirection(o: Order): "pos-to-kiosk" | "kiosk-to-pos" | "kiosk-to-pos-to-kiosk" | undefined {
    if (o.status !== "COMPLETED") return undefined;
    if (kioskToPosToKioskCompletedIds.has(o.orderId)) return "kiosk-to-pos-to-kiosk";
    if (posSentToKioskCompletedIds.has(o.orderId)) return "pos-to-kiosk";
    if (kioskToPosTransferCompletedIds.has(o.orderId)) return "kiosk-to-pos";
    return undefined;
  }

  const filtered = orders.filter((o) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return ACTIVE_STATUSES.includes(o.status as OrderStatus);
    if (filter === "COMPLETED") return o.status === "COMPLETED" && !getTransferDirection(o);
    if (filter === "EXPIRED") return o.status === "EXPIRED" || o.status === "CANCELLED";
    if (filter === "TRANSFERRED") return getTransferDirection(o) === "pos-to-kiosk" || getTransferDirection(o) === "kiosk-to-pos";
    if (filter === "KIOSK_TRANSFER") return getTransferDirection(o) === "kiosk-to-pos-to-kiosk";
    return true;
  });

  const transferredCount = orders.filter((o) => {
    const d = getTransferDirection(o);
    return d === "pos-to-kiosk" || d === "kiosk-to-pos";
  }).length;
  const kioskTransferCount = orders.filter((o) => getTransferDirection(o) === "kiosk-to-pos-to-kiosk").length;

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: "ALL", label: "All", count: orders.length },
    { id: "ACTIVE", label: "Active" },
    { id: "COMPLETED", label: "Completed" },
    { id: "TRANSFERRED", label: "Transferred", count: transferredCount },
    { id: "KIOSK_TRANSFER", label: "Kiosk ↔ POS", count: kioskTransferCount },
    { id: "EXPIRED", label: "Expired / Cancelled" },
  ];

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex gap-1 flex-wrap">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                    filter === t.id
                      ? "bg-green-500 text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {t.label}
                  {t.count !== undefined && (
                    <span className="ml-1.5 opacity-70">({t.count})</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={fetchOrders}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600 transition font-medium"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Loading orders…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <p className="text-4xl">📋</p>
                <p className="text-sm font-medium">No orders found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filtered.map((order) => (
                  <OrderCard
                    key={order.orderId}
                    order={order}
                    transferDirection={getTransferDirection(order)}
                  />
                ))}
              </div>
            )}
          </div>
    </main>
  );
}
