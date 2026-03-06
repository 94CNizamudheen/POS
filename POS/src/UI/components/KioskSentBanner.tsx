import { useEffect, useRef, useState } from "react";
import { CheckCircle, Clock, Send, ShoppingBag, X } from "lucide-react";
import { useOrder } from "@/context/OrderContext";

// ── Step indicator ─────────────────────────────────────────────────────────────

const steps = [
  { label: "Sent" },
  { label: "At Kiosk" },
  { label: "Accepted" },
];

function StepBar({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center w-full max-w-xs">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-green-100 text-green-700 ring-4 ring-green-100"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold whitespace-nowrap ${
                  done || active ? "text-gray-700" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mb-4 mx-1 rounded transition-all ${
                  i < current ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function KioskSentBanner() {
  const { kioskSentOrder, clearKioskSentOrder, releaseOrder } = useOrder();
  const [updatedFlash, setUpdatedFlash] = useState(false);
  const prevItemsKey = useRef<string>("");

  // Flash items list when KIOSK customer edits
  useEffect(() => {
    if (!kioskSentOrder) return;
    const key = JSON.stringify(kioskSentOrder.items);
    if (prevItemsKey.current && prevItemsKey.current !== key) {
      setUpdatedFlash(true);
      const t = setTimeout(() => setUpdatedFlash(false), 1500);
      return () => clearTimeout(t);
    }
    prevItemsKey.current = key;
  }, [kioskSentOrder?.items]);

  if (!kioskSentOrder) return null;

  const order = kioskSentOrder;
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = order.total ?? subtotal * 1.1;

  function handleCancel() {
    clearKioskSentOrder();
    releaseOrder(order.orderId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 rounded-3xl px-8 py-8 shadow-2xl w-full max-w-md mx-4 bg-white">

        {/* Step bar */}
        <StepBar current={1} />

        {/* Icon + order number */}
        <div className="flex flex-col items-center gap-2 mt-1">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full border-4 border-gray-100 animate-spin"
              style={{ borderTopColor: "#22c55e" }}
            />
            <Send className="w-6 h-6 text-green-500 absolute inset-0 m-auto" />
          </div>

          <div className="text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Order sent
            </p>
            <p className="text-4xl font-extrabold text-gray-900">
              #{order.orderNumber}
            </p>
          </div>

          <p className="text-center font-bold text-gray-700 text-sm">
            Waiting for customer to review at kiosk…
          </p>
          <p className="text-xs text-gray-400 text-center">
            Customer can add items or proceed to payment. You'll be notified when they accept.
          </p>
        </div>

        {/* Items */}
        <div
          className={`w-full rounded-2xl overflow-hidden border transition-all duration-300 ${
            updatedFlash ? "border-green-400 shadow-md shadow-green-50" : "border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Sent items
              </span>
            </div>
            {updatedFlash && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Updated by customer
              </span>
            )}
          </div>

          <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                    {item.qty}
                  </span>
                  <span className="text-sm font-semibold text-gray-800 line-clamp-1">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-600 shrink-0 ml-2">
                  ${(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <span className="text-sm font-bold text-gray-700">Total</span>
            <span className="text-base font-extrabold text-gray-900">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Cancel / recall order */}
        <button
          onClick={handleCancel}
          className="w-full py-3 rounded-full border-2 border-gray-200 text-gray-500 font-bold text-sm hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel &amp; Recall Order
        </button>

        {/* Waiting indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>This will close automatically when customer accepts</span>
        </div>
      </div>
    </div>
  );
}
