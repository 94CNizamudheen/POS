import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw } from "lucide-react";
import Header from "../components/Header";
import MenuSelectionSidebar from "../components/MenuSelectionSidebar";
import OrderCard from "../components/OrderCard";
import type { Order, OrderStatus } from "@/types/order";
// import { useNavigate } from "react-router-dom";

type FilterTab = "ALL" | "ACTIVE" | "COMPLETED" | "EXPIRED";

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
                  <OrderCard key={order.orderId} order={order} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
