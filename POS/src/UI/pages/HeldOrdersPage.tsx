import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PauseCircle, Trash2 } from "lucide-react";
import { useOrder } from "@/context/OrderContext";
import {
  orderLocalService,
  type HeldOrder,
} from "@/services/local/order.local.service";

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function HeldOrdersPage() {
  const navigate = useNavigate();
  const { resumeHeldOrder, activeOrder } = useOrder();
  const [tickets, setTickets] = useState<HeldOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setTickets(await orderLocalService.getAllHeld());
    } catch (e) {
      console.error("Failed to load held orders:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleResume(held: HeldOrder) {
    const order = orderLocalService.parseHeldOrder(held);
    if (!order) return;
    resumeHeldOrder(order);
  }

  async function handleDelete(held: HeldOrder) {
    await orderLocalService.deleteHeld(held.orderId);
    setTickets((prev) => prev.filter((t) => t.orderId !== held.orderId));
    setConfirmDeleteId(null);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-3 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-800 transition text-sm font-semibold"
        >
          ← Back
        </button>
        <PauseCircle className="w-5 h-5 text-amber-500" />
        <h1 className="text-base font-bold text-gray-800">
          Held Orders
          {tickets.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold">
              {tickets.length}
            </span>
          )}
        </h1>
      </div>

      {/* Active order notice */}
      {activeOrder && (
        <div className="mx-6 mt-4 px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-xl text-sm text-yellow-800 font-medium">
          Active order{" "}
          <span className="font-extrabold">#{activeOrder.orderNumber}</span>{" "}
          will be held when you resume another order.
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-64 gap-4 text-gray-400">
            <div className="rounded-full bg-amber-500/10 p-6">
              <PauseCircle className="w-12 h-12 text-amber-400 opacity-60" />
            </div>
            <p className="text-base font-semibold text-gray-500">
              No held orders
            </p>
            <p className="text-sm text-gray-400">
              Orders put on hold while handling a KIOSK request will appear here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tickets.map((held) => {
              const order = orderLocalService.parseHeldOrder(held);
              const itemSummary = order
                ? order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")
                : "—";

              return (
                <div
                  key={held.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col"
                >
                  {/* Amber accent bar */}
                  <div className="h-1 bg-amber-500" />

                  <div className="p-4 flex items-stretch gap-4 flex-1">
                    {/* Order number block */}
                    <div className="shrink-0 flex flex-col items-center justify-center bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 min-w-20">
                      <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest leading-none mb-1">
                        Hold
                      </span>
                      <span className="text-2xl font-black text-amber-600 leading-tight">
                        #{held.orderNumber}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-bold text-gray-900">
                          ${held.total.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {order ? order.items.length : 0} items
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {itemSummary}
                      </p>
                      <p className="text-xs text-gray-400">
                        {timeAgo(held.heldAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    {confirmDeleteId === held.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(held)}
                          className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleResume(held)}
                          className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition"
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(held.id)}
                          className="py-2 px-3 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
