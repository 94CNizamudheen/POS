import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw } from "lucide-react";
import Header from "../components/Header";
import MenuSelectionSidebar from "../components/MenuSelectionSidebar";
import type { Order, OrderStatus } from "@/types/order";
// import { useNavigate } from "react-router-dom";

type FilterTab = "ALL" | "ACTIVE" | "COMPLETED" | "EXPIRED";

const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-gray-100 text-gray-600" },
  TRANSFERRED: { label: "Transferred", cls: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-yellow-100 text-yellow-700" },
  PAYMENT_PENDING: {
    label: "Payment Pending",
    cls: "bg-orange-100 text-orange-700",
  },
  COMPLETED: { label: "Completed", cls: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Expired", cls: "bg-red-100 text-red-600" },
  CANCELLED: { label: "Cancelled", cls: "bg-red-100 text-red-600" },
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTIVE_STATUSES: OrderStatus[] = [
  "DRAFT",
  "TRANSFERRED",
  "IN_PROGRESS",
  "PAYMENT_PENDING",
];

export default function OrdersPage() {
  // const navigate = useNavigate();
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

  const filtered = orders.filter((o) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE")
      return ACTIVE_STATUSES.includes(o.status as OrderStatus);
    if (filter === "COMPLETED") return o.status === "COMPLETED";
    if (filter === "EXPIRED")
      return o.status === "EXPIRED" || o.status === "CANCELLED";
    return true;
  });

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "ACTIVE", label: "Active" },
    { id: "COMPLETED", label: "Completed" },
    { id: "EXPIRED", label: "Expired / Cancelled" },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <MenuSelectionSidebar activeNav="order" />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex gap-1">
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
                  {t.id === "ALL" && (
                    <span className="ml-1.5 opacity-70">({orders.length})</span>
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

          {/* Table */}
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Order #</th>
                      <th className="text-left px-5 py-3">Items</th>
                      <th className="text-left px-5 py-3">Origin</th>
                      <th className="text-left px-5 py-3">Status</th>
                      <th className="text-left px-5 py-3">Payment</th>
                      <th className="text-right px-5 py-3">Total</th>
                      <th className="text-right px-5 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((order, i) => {
                      const badge = STATUS_BADGE[
                        order.status as OrderStatus
                      ] ?? {
                        label: order.status,
                        cls: "bg-gray-100 text-gray-600",
                      };
                      return (
                        <tr
                          key={order.orderId}
                          className={`border-b border-gray-50 hover:bg-gray-50 transition ${
                            i === filtered.length - 1 ? "border-0" : ""
                          }`}
                        >
                          <td className="px-5 py-3 font-bold text-gray-800">
                            #{order.orderNumber}
                          </td>
                          <td className="px-5 py-3 text-gray-500 max-w-50">
                            <p className="truncate">
                              {order.items
                                .map((it) => `${it.qty}× ${it.name}`)
                                .join(", ")}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-gray-400 text-xs">
                            {order.originTerminal.terminalId}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs uppercase">
                            {order.paymentMethod ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-green-600">
                            ${order.total.toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                            {formatTime(order.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
