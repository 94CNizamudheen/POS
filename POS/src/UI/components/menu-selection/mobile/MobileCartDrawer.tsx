import { useState } from "react";
import {
  X,
  Minus,
  Plus,
  Banknote,
  CreditCard,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  WifiOff,
  LogOut,
} from "lucide-react";
import { useEffect } from "react";
import { orderWebSocketService } from "@/services/orderWebSocket/orderWebSocket.service";
import { appLocalService } from "@/services/local/app.local.service";
import emptyCartImg from "@/assets/empty-cart.png";
import dishPlaceholder from "@/assets/dish-placeholder.jpg";
import type { CartItem } from "../CartSidebar";
import type { PaymentMethod } from "@/types/order";
import { useOrder } from "@/context/OrderContext";
import OrderSuccessModal from "../OrderSuccessModal";

function getProductImage(media?: string): string {
  if (!media || media === "[]") return dishPlaceholder;
  try {
    const parsed = JSON.parse(media) as { filepath: string }[];
    return parsed[0]?.filepath ?? dishPlaceholder;
  } catch {
    return dishPlaceholder;
  }
}

const paymentMethods: {
  icon: typeof Banknote;
  label: string;
  method: PaymentMethod;
}[] = [
  { icon: Banknote, label: "Cash", method: "CASH" },
  { icon: CreditCard, label: "Card", method: "CARD" },
  { icon: Wallet, label: "E-Wallet", method: "EWALLET" },
];

interface MobileCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCart: () => void;
}

export default function MobileCartDrawer({
  isOpen,
  onClose,
  items,
  onIncrease,
  onDecrease,
  onRemove,
  onClearCart,
}: MobileCartDrawerProps) {
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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [placing, setPlacing] = useState(false);

  const isAssistanceOrder =
    activeOrder !== null && activeOrder.originTerminal.type === "KIOSK";

  useEffect(() => {
    appLocalService
      .getPairedKioskId()
      .then(setPairedKioskId)
      .catch(() => {});
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Drawer */}
      <div className="relative bg-white rounded-t-3xl flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Your Order</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10">
              <img
                src={emptyCartImg}
                alt="Empty cart"
                className="w-32 h-32 object-contain opacity-80"
              />
              <p className="text-gray-400 text-sm mt-2">No items added yet</p>
            </div>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5"
            >
              <img
                src={getProductImage(item.media)}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-200"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = dishPlaceholder;
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-green-600 font-semibold">
                  ${(item.price * item.qty).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onDecrease(item.id)}
                  className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-500 transition"
                >
                  <Minus className="w-3 h-3 text-white" />
                </button>
                <span className="text-xs font-bold w-5 text-center text-gray-800">
                  {item.qty}
                </span>
                <button
                  onClick={() => onIncrease(item.id)}
                  className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-500 transition"
                >
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 border-t border-dashed border-gray-200 flex flex-col gap-3">
          {/* Totals */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span className="text-green-600 font-semibold">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tax 10%</span>
              <span className="text-green-600 font-semibold">
                ${tax.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold mt-1">
              <span className="text-red-500">Total</span>
              <span className="text-green-600">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Payment Method
            </p>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(({ icon: Icon, label, method }) => (
                <button
                  key={label}
                  onClick={() => setSelectedMethod(method)}
                  className={`flex flex-col items-center gap-1 py-2.5 border rounded-xl text-xs transition ${
                    selectedMethod === method
                      ? "border-green-400 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Pull Kiosk Cart */}
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

          {/* Push to Kiosk */}
          {!isAssistanceOrder && pairedKioskId && (
            <button
              onClick={() => {
                if (!isConnected || items.length === 0) return;
                sendToKiosk(items, pairedKioskId ?? undefined);
                onClearCart();
                onClose();
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

          {/* Return to customer */}
          {isAssistanceOrder && (
            <button
              onClick={() => releaseOrder(activeOrder!.orderId)}
              className="w-full py-2.5 flex items-center justify-center gap-2 border-2 border-yellow-400 text-yellow-700 font-bold rounded-xl text-sm hover:bg-yellow-50 transition"
            >
              Return to Customer
            </button>
          )}

          {/* Place Order */}
          <button
            onClick={async () => {
              if (!selectedMethod || placing) return;
              setPlacing(true);
              try {
                if (activeOrder && activeOrder.status !== "DRAFT") {
                  completeOrder(activeOrder.orderId, selectedMethod);
                } else {
                  await completeDirectOrder(items, selectedMethod);
                  if (activeOrder?.status === "DRAFT") clearActiveOrder();
                  onClearCart();
                }
                setSelectedMethod(null);
                onClose();
              } finally {
                setPlacing(false);
              }
            }}
            disabled={items.length === 0 || !selectedMethod || placing}
            className="w-full py-3.5 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 transition text-sm shadow-md shadow-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {placing
              ? "Processing…"
              : isAssistanceOrder
                ? "Complete at Cashier"
                : "Place Order"}
          </button>
        </div>
      </div>

      {lastCompletedOrder && (
        <OrderSuccessModal
          order={lastCompletedOrder}
          onClose={() => {
            clearCompletedOrder();
            onClearCart();
          }}
        />
      )}
    </div>
  );
}
