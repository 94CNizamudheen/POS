import type { Order, OrderStatus } from "@/types/order";

const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-gray-100 text-gray-600" },
  PENDING_KIOSK: { label: "Pending Kiosk", cls: "bg-purple-100 text-purple-700" },
  TRANSFERRED: { label: "Transferred", cls: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-yellow-100 text-yellow-700" },
  PAYMENT_PENDING: { label: "Payment Pending", cls: "bg-orange-100 text-orange-700" },
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

export default function OrderCard({ order }: { order: Order }) {
  const badge = STATUS_BADGE[order.status as OrderStatus] ?? {
    label: order.status,
    cls: "bg-gray-100 text-gray-600",
  };

  const isKioskOrder = order.originTerminal.type === "KIOSK";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-gray-900 text-sm">
            #{order.orderNumber}
          </span>
          {isKioskOrder && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
              KIOSK
            </span>
          )}
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Items — scrollable when list overflows */}
      <div className="overflow-y-auto max-h-40 px-4 py-2 divide-y divide-gray-50">
        {order.items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between py-2 gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                {item.qty}
              </span>
              <span className="text-xs text-gray-700 font-medium truncate">
                {item.name}
              </span>
            </div>
            <span className="text-xs text-gray-500 font-semibold shrink-0">
              ${(item.price * item.qty).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
            {order.originTerminal.terminalId}
          </span>
          <span className="text-[10px] text-gray-400">
            {formatTime(order.createdAt)}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-base font-extrabold text-green-600">
            ${order.total.toFixed(2)}
          </span>
          {order.paymentMethod && (
            <span className="text-[10px] text-gray-400 uppercase font-semibold">
              {order.paymentMethod}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
