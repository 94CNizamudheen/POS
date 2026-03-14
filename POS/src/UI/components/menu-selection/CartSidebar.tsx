import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Minus,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  WifiOff,
  ShoppingCart,
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
import OrderSuccessModal from "./OrderSuccessModal";

export interface CartItem extends Product {
  qty: number;
}

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

  useEffect(() => {
    appLocalService.getPairedKioskId()
      .then(setPairedKioskId)
      .catch(() => {});
  }, []);

  const isAssistanceOrder =
    activeOrder !== null && activeOrder.originTerminal.type === "KIOSK";
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
      className="w-[30%] h-full bg-surface-raised border-l border-subtle flex flex-col px-4 py-4 gap-3"
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold text-primary">New Order Bill</h2>
        <span className="text-xs text-muted">{today}</span>
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 mt-4">
            <img
              src={emptyCartImg}
              alt="Empty cart"
              className="w-40 h-40 object-contain opacity-80"
            />
            <p className="text-muted text-sm mt-2">No items added yet</p>
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 bg-surface rounded-xl p-2"
          >
            <img
              src={getProductImage(item.media)}
              alt={item.name}
              className="w-10 h-10 rounded-lg object-cover shrink-0 bg-surface-sunken"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = dishPlaceholder;
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-primary truncate">
                {item.name}
              </p>
              <p className="text-xs text-muted">
                ${(item.price * item.qty).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDecrease(item.id)}
                className="w-6 h-6 rounded-full bg-warning flex items-center justify-center hover:bg-warning transition"
              >
                <Minus className="w-3 h-3 text-white" />
              </button>
              <span className="text-xs font-bold w-4 text-center text-primary">
                {item.qty}
              </span>
              <button
                onClick={() => onIncrease(item.id)}
                className="w-6 h-6 rounded-full bg-warning flex items-center justify-center hover:bg-warning transition"
              >
                <Plus className="w-3 h-3 text-white" />
              </button>
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="text-danger text-xs ml-1 hover:text-danger transition font-medium"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-default pt-3 flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-secondary">
          <span>Sub Total</span>
          <span className="text-success font-semibold">
            ${subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-xs text-secondary">
          <span>Tax 10%</span>
          <span className="text-success font-semibold">
            ${tax.toFixed(2)}
          </span>
        </div>
        <hr className="border-dashed border-default my-1" />
        <div className="flex justify-between text-sm font-bold">
          <span className="text-danger">Total</span>
          <span className="text-success">${total.toFixed(2)}</span>
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

      {/* Kiosk return banner — only when kiosk is remote (DISTANCE), not side-by-side */}
      {isAssistanceOrder && !pairedKioskId && (
        <div className="rounded-xl border-2 border-warning bg-warning-subtle px-3 py-3 flex flex-col items-center gap-1">
          <p className="text-[10px] font-bold text-warning uppercase tracking-widest">
            Customer Kiosk Code
          </p>
          <p className="text-3xl font-black tracking-widest text-warning">
            #{activeOrder!.orderNumber}
          </p>
          <p className="text-[10px] text-warning text-center leading-tight">
            Tell the customer to enter this number at the kiosk to continue
            their order
          </p>
        </div>
      )}

      {/* Option A — return order to customer at KIOSK */}
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
        onClick={() => navigate("/pos/payment", { state: { items } })}
        disabled={items.length === 0}
        className="w-full py-3 bg-success text-white font-bold rounded-xl hover:bg-success transition text-sm shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-4 h-4" />
        {isAssistanceOrder ? "Complete at Cashier" : "Proceed to Payment"}
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
