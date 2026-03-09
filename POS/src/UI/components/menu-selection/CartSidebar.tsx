import { useEffect, useState } from "react";
import {
  Minus,
  Plus,
  Banknote,
  CreditCard,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  WifiOff,
} from "lucide-react";
import { orderWebSocketService } from "@/services/orderWebSocket/orderWebSocket.service";
import { appLocalService } from "@/services/local/app.local.service";
import emptyCartImg from "@/assets/empty-cart.png";
import dishPlaceholder from "@/assets/dish-placeholder.jpg";

function getProductImage(media?: string): string {
  if (!media || media === "[]") return dishPlaceholder;
  try {
    const parsed = JSON.parse(media) as { filepath: string }[];
    return parsed[0]?.filepath ?? dishPlaceholder;
  } catch {
    return dishPlaceholder;
  }
}
import type { Product } from "@/types/product";
import { useOrder } from "@/context/OrderContext";
import type { PaymentMethod } from "@/types/order";
import OrderSuccessModal from "./OrderSuccessModal";

export interface CartItem extends Product {
  qty: number;
}

const paymentMethods: {
  icon: typeof Banknote;
  label: string;
  method: PaymentMethod;
}[] = [
  { icon: Banknote, label: "Cash", method: "CASH" },
  { icon: CreditCard, label: "Debit Card", method: "CARD" },
  { icon: Wallet, label: "E-Wallet", method: "EWALLET" },
];

interface CartSidebarProps {
  items: CartItem[];
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCart: () => void;
}

export default function CartSidebar({
  items,
  onIncrease,
  onDecrease,
  onRemove,
  onClearCart,
}: CartSidebarProps) {
  const {
    activeOrder,
    sendToKiosk,
    preparePullClaim,
    completeOrder,
    completeDirectOrder,
    clearActiveOrder,
    releaseOrder,
    isConnected,
    lastCompletedOrder,
    clearCompletedOrder,
  } = useOrder();
  const [pulling, setPulling] = useState(false);
  const [pairedKioskId, setPairedKioskId] = useState<string | null>(null);

  useEffect(() => {
    appLocalService.getPairedKioskId()
      .then(setPairedKioskId)
      .catch(() => {});
  }, []);

  const isAssistanceOrder =
    activeOrder !== null && activeOrder.originTerminal.type === "KIOSK";
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [placing, setPlacing] = useState(false);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <aside
      id="cart-button"
      className="w-[30%] h-full bg-white border-l border-gray-100 flex flex-col px-4 py-4 gap-3"
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold text-gray-800">New Order Bill</h2>
        <span className="text-xs text-gray-400">{today}</span>
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 mt-4">
            <img
              src={emptyCartImg}
              alt="Empty cart"
              className="w-40 h-40 object-contain opacity-80"
            />
            <p className="text-gray-400 text-sm mt-2">No items added yet</p>
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 bg-gray-50 rounded-xl p-2"
          >
            <img
              src={getProductImage(item.media)}
              alt={item.name}
              className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-200"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = dishPlaceholder;
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate">
                {item.name}
              </p>
              <p className="text-xs text-gray-400">
                ${(item.price * item.qty).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDecrease(item.id)}
                className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-500 transition"
              >
                <Minus className="w-3 h-3 text-white" />
              </button>
              <span className="text-xs font-bold w-4 text-center">
                {item.qty}
              </span>
              <button
                onClick={() => onIncrease(item.id)}
                className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-500 transition"
              >
                <Plus className="w-3 h-3 text-white" />
              </button>
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="text-red-400 text-xs ml-1 hover:text-red-600 transition font-medium"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-200 pt-3 flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Sub Total</span>
          <span className="text-green-500 font-semibold">
            ${subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Tax 10%</span>
          <span className="text-green-500 font-semibold">
            ${tax.toFixed(2)}
          </span>
        </div>
        <hr className="border-dashed border-gray-200 my-1" />
        <div className="flex justify-between text-sm font-bold">
          <span className="text-red-500">Total</span>
          <span className="text-green-500">${total.toFixed(2)}</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">
          Payment Method
        </p>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map(({ icon: Icon, label, method }) => (
            <button
              key={label}
              onClick={() => setSelectedMethod(method)}
              className={`flex flex-col items-center gap-1 py-2 border rounded-xl text-xs transition ${
                selectedMethod === method
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Pull — only when paired kiosk is set and cart is empty */}
      {!isAssistanceOrder && pairedKioskId && items.length === 0 && (
        <button
          onClick={() => {
            if (!isConnected || pulling) return;
            setPulling(true);
            preparePullClaim();
            orderWebSocketService.pullKioskCart(pairedKioskId);
            setTimeout(() => setPulling(false), 3000);
          }}
          disabled={!isConnected || pulling}
          className={`w-full py-2.5 flex items-center justify-center gap-2 border-2 font-bold rounded-xl text-sm transition disabled:cursor-not-allowed ${
            isConnected
              ? "border-indigo-400 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
              : "border-red-200 bg-red-50 text-red-400"
          }`}
        >
          {isConnected ? (
            <ArrowDownToLine className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          {!isConnected ? "Kiosk Disconnected" : pulling ? "Pulling…" : "Pull Kiosk Cart"}
        </button>
      )}

      {/* Push — always visible when paired, disabled when disconnected */}
      {!isAssistanceOrder && pairedKioskId && (
        <button
          onClick={() => {
            if (!isConnected || items.length === 0) return;
            sendToKiosk(items, pairedKioskId ?? undefined);
            onClearCart();
          }}
          disabled={!isConnected || items.length === 0}
          className={`w-full py-2.5 flex items-center justify-center gap-2 border-2 font-bold rounded-xl text-sm transition disabled:cursor-not-allowed ${
            isConnected
              ? "border-indigo-400 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
              : "border-red-200 bg-red-50 text-red-400"
          }`}
        >
          {isConnected ? (
            <ArrowUpFromLine className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          {isConnected ? "Push to Kiosk" : "Kiosk Disconnected"}
        </button>
      )}

      {/* Kiosk return banner — only when kiosk is remote (DISTANCE), not side-by-side */}
      {isAssistanceOrder && !pairedKioskId && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-3 flex flex-col items-center gap-1">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
            Customer Kiosk Code
          </p>
          <p className="text-3xl font-black tracking-widest text-amber-700">
            #{activeOrder!.orderNumber}
          </p>
          <p className="text-[10px] text-amber-500 text-center leading-tight">
            Tell the customer to enter this number at the kiosk to continue
            their order
          </p>
        </div>
      )}

      {/* Option A — return order to customer at KIOSK */}
      {isAssistanceOrder && (
        <button
          onClick={() => releaseOrder(activeOrder!.orderId)}
          className="w-full py-2.5 flex items-center justify-center gap-2 border-2 border-yellow-400 text-yellow-700 font-bold rounded-xl text-sm hover:bg-yellow-50 transition"
        >
          Return to Customer
        </button>
      )}

      {/* Option B — complete at POS */}
      <button
        onClick={async () => {
          if (!selectedMethod || placing) return;
          setPlacing(true);
          try {
            if (activeOrder && activeOrder.status !== "DRAFT") {
              // Server-tracked KIOSK order — complete via WS
              completeOrder(activeOrder.orderId, selectedMethod);
            } else {
              // Walk-up sale or resumed DRAFT held cart — complete locally
              await completeDirectOrder(items, selectedMethod);
              if (activeOrder?.status === "DRAFT") clearActiveOrder();
              onClearCart();
            }
            setSelectedMethod(null);
          } finally {
            setPlacing(false);
          }
        }}
        disabled={items.length === 0 || !selectedMethod || placing}
        className="w-full py-3 bg-green-400 text-white font-bold rounded-xl hover:bg-green-500 transition text-sm shadow-md shadow-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {placing
          ? "Processing…"
          : isAssistanceOrder
            ? "Complete at Cashier"
            : "Place Order"}
      </button>

      {lastCompletedOrder && (
        <OrderSuccessModal
          order={lastCompletedOrder}
          onClose={() => {
            clearCompletedOrder();
            onClearCart();
          }}
        />
      )}
    </aside>
  );
}
