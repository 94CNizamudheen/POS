import { useNavigate } from "react-router-dom";
import { useOrder } from "@/context/OrderContext";
import type { Order } from "@/types/order";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function OrderCard({ order, onClaim }: { order: Order; onClaim: () => void }) {
  const itemSummary = order.items
    .map((i) => `${i.qty}× ${i.name}`)
    .join(", ");

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-lg font-extrabold text-gray-900">
          #{order.orderNumber}
        </span>
        <span className="text-xs text-gray-400">{timeAgo(order.createdAt)}</span>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2">{itemSummary}</p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-green-500">
          ${order.total.toFixed(2)}
        </span>
        <span className="text-xs text-gray-400">
          from {order.originTerminal.terminalId}
        </span>
      </div>

      <button
        onClick={onClaim}
        className="w-full py-2.5 rounded-xl bg-green-400 text-white font-bold text-sm hover:bg-green-500 transition"
      >
        Claim Order
      </button>
    </div>
  );
}

export default function IncomingOrders() {
  const navigate = useNavigate();
  const { incomingOrders, activeOrder, claimOrder, notification, clearNotification } = useOrder();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-3 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => navigate("/pos")}
          className="text-gray-500 hover:text-gray-800 transition text-sm font-semibold"
        >
          ← Back
        </button>
        <h1 className="text-base font-bold text-gray-800">
          Incoming Orders
          {incomingOrders.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
              {incomingOrders.length}
            </span>
          )}
        </h1>
      </div>

      {/* Active order hold warning */}
      {activeOrder && (
        <div className="mx-6 mt-4 px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-xl text-sm text-yellow-800 font-medium">
          You have active order <span className="font-extrabold">#{activeOrder.orderNumber}</span> in progress.
          Claiming a new order will automatically put it on hold — you can resume it from the cart sidebar.
        </div>
      )}

      {/* Toast notification */}
      {notification && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium flex items-center justify-between">
          {notification}
          <button onClick={clearNotification} className="text-red-400 hover:text-red-600 ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {incomingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <p className="text-4xl">📭</p>
            <p className="text-sm font-medium">No incoming orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {incomingOrders.map((order) => (
              <OrderCard
                key={order.orderId}
                order={order}
                onClaim={() => claimOrder(order.orderId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
