import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Minus,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  WifiOff,
  LogOut,
  ShoppingCart,
} from "lucide-react";
import { useEffect } from "react";
import { orderWebSocketService } from "@/services/orderWebSocket/orderWebSocket.service";
import { appLocalService } from "@/services/local/app.local.service";
import emptyCartImg from "@/assets/empty-cart.png";
import dishPlaceholder from "@/assets/dish-placeholder.jpg";
import type { CartItem } from "../CartSidebar";
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
  const navigate = useNavigate();
  const {
    activeOrder,
    sendToKiosk,
    preparePullClaim,
    releaseOrder,
    isConnected,
    lastCompletedOrder,
    clearCompletedOrder,
  } = useOrder();

  const [pulling, setPulling] = useState(false);
  const [pairedKioskId, setPairedKioskId] = useState<string | null>(null);

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
      <div className="relative bg-surface-raised rounded-t-3xl flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-subtle">
          <h2 className="text-base font-bold text-primary">Your Order</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-sunken text-muted hover:bg-surface-sunken transition"
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
              <p className="text-muted text-sm mt-2">No items added yet</p>
            </div>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-surface rounded-xl p-2.5"
            >
              <img
                src={getProductImage(item.media)}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-cover shrink-0 bg-surface-sunken"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = dishPlaceholder;
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary truncate">
                  {item.name}
                </p>
                <p className="text-xs text-success font-semibold">
                  ${(item.price * item.qty).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onDecrease(item.id)}
                  className="w-7 h-7 rounded-full bg-warning flex items-center justify-center hover:bg-warning transition"
                >
                  <Minus className="w-3 h-3 text-white" />
                </button>
                <span className="text-xs font-bold w-5 text-center text-primary">
                  {item.qty}
                </span>
                <button
                  onClick={() => onIncrease(item.id)}
                  className="w-7 h-7 rounded-full bg-warning flex items-center justify-center hover:bg-warning transition"
                >
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-danger hover:bg-danger-subtle hover:text-danger transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 border-t border-dashed border-default flex flex-col gap-3">
          {/* Totals */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-muted">
              <span>Subtotal</span>
              <span className="text-success font-semibold">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>Tax 10%</span>
              <span className="text-success font-semibold">
                ${tax.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold mt-1">
              <span className="text-danger">Total</span>
              <span className="text-success">${total.toFixed(2)}</span>
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
                  ? "border-info text-info hover:bg-info-subtle disabled:opacity-40"
                  : "border-danger bg-danger-subtle text-danger"
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
                  ? "border-info text-info hover:bg-info-subtle disabled:opacity-40"
                  : "border-danger bg-danger-subtle text-danger"
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
              className="w-full py-2.5 flex items-center justify-center gap-2 border-2 border-warning text-warning font-bold rounded-xl text-sm hover:bg-warning-subtle transition"
            >
              Return to Customer
            </button>
          )}

          {/* Proceed to Payment */}
          <button
            onClick={() => {
              onClose();
              navigate("/pos/payment", { state: { items } });
            }}
            disabled={items.length === 0}
            className="w-full py-3.5 bg-success text-white font-bold rounded-2xl hover:bg-success transition text-sm shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {isAssistanceOrder ? "Complete at Cashier" : "Proceed to Payment"}
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
