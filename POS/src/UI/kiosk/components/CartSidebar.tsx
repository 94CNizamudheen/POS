import { useEffect, useState } from "react";
import {
  Minus,
  Plus,
  Trash2,
  HeadphonesIcon,
  MapPin,
  X,
  MonitorUp,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CartItem } from "@/types/product";
import { useOrder } from "@/context/kiosk/OrderContext";
import { useApp } from "@/context/kiosk/AppContext";
import emptyCartImg from "@assets/empty-cart.png";
import dishPlaceholder from "@assets/dish-placeholder.jpg";

function getProductImage(media?: string): string {
  if (!media || media === "[]") return dishPlaceholder;
  try {
    const parsed = JSON.parse(media) as { filepath: string }[];
    return parsed[0]?.filepath ?? dishPlaceholder;
  } catch {
    return dishPlaceholder;
  }
}
interface CartSidebarProps {
  cartItems: CartItem[];
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function CartSidebar({
  cartItems,
  onIncrease,
  onDecrease,
  onRemove,
}: CartSidebarProps) {
  const navigate = useNavigate();
  const {
    requestMoveToPOS,
    movedToPosOrder,
    clearMovedToPosOrder,
    isConnected,
    activeOrder,
    assistanceHandedBack,
  } = useOrder();
  const { position } = useApp();
  const [showAssistDialog, setShowAssistDialog] = useState(false);
  const [waitingForOrderNumber, setWaitingForOrderNumber] = useState(false);

  // When server confirms the order number, stop the loading spinner
  useEffect(() => {
    if (movedToPosOrder) setWaitingForOrderNumber(false);
  }, [movedToPosOrder]);

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  const isBeingAssisted =
    activeOrder !== null &&
    activeOrder.ownerTerminal !== null &&
    (activeOrder.status === "TRANSFERRED" ||
      activeOrder.status === "IN_PROGRESS");
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  const count = cartItems.reduce((s, i) => s + i.qty, 0);

  // function handleStayAtKiosk() {
  //   setShowAssistDialog(false);
  //   requestAssistance(cartItems);
  // }

  function handleMoveToPOS() {
    setWaitingForOrderNumber(true);
    requestMoveToPOS(cartItems);
    // Dialog stays open — waits for movedToPosOrder to show the order number
  }

  function handleConfirmWalkToPOS() {
    clearMovedToPosOrder();
    setShowAssistDialog(false);
    navigate("/kiosk");
  }

  return (
    <div
      className="flex flex-col h-full rounded-2xl p-5"
      style={{ backgroundColor: "#F1F1EC" }}
    >
      {/* ── Assist dialog (3 states: choice → loading → order number) ─────── */}
      {showAssistDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="relative flex flex-col items-center gap-5 rounded-3xl px-8 py-8 shadow-2xl w-full max-w-sm mx-4"
            style={{ backgroundColor: "#F1F1EC" }}
          >
            {/* Close — only when not mid-request */}
            {!waitingForOrderNumber && !movedToPosOrder && (
              <button
                onClick={() => setShowAssistDialog(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            )}

            {/* ── State 1: waiting for server to assign order number ── */}
            {waitingForOrderNumber && !movedToPosOrder && (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
                <p className="text-base font-bold text-gray-700 text-center">
                  Creating your order…
                </p>
              </>
            )}

            {/* ── State 2: order number received — show to customer ── */}
            {movedToPosOrder && (
              <>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#B5E533" }}
                >
                  <MapPin className="w-7 h-7 text-black" />
                </div>

                <div className="text-center">
                  <p className="text-base font-bold text-gray-700">
                    Walk to the POS counter
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tell the cashier your order number
                  </p>
                </div>

                {/* Big order number */}
                <div
                  className="w-full rounded-2xl px-6 py-5 flex flex-col items-center gap-1 border-2 border-amber-300"
                  style={{ backgroundColor: "#fffbeb" }}
                >
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                    Your Order Number
                  </p>
                  <p className="text-5xl font-black tracking-widest text-amber-700">
                    #{movedToPosOrder.orderNumber}
                  </p>
                  <p className="text-xs text-amber-500 mt-1 text-center">
                    Show this to the cashier at the POS counter
                  </p>
                </div>

                <button
                  onClick={handleConfirmWalkToPOS}
                  className="w-full py-4 rounded-full font-extrabold text-base text-black transition-all active:scale-95 hover:opacity-90"
                  style={{ backgroundColor: "#B5E533" }}
                >
                  OK, heading to POS
                </button>
              </>
            )}

            {/* ── State 0: initial choice ── */}
            {!waitingForOrderNumber && !movedToPosOrder && (
              <>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#B5E533" }}
                >
                  <HeadphonesIcon className="w-7 h-7 text-black" />
                </div>

                <p className="text-xl font-extrabold text-gray-900">
                  Are You Sure ?
                </p>

                <button
                  onClick={handleMoveToPOS}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-white border-2 border-transparent hover:border-gray-400 transition-all active:scale-95 text-left"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-800">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-900 text-sm">
                      Move to POS Counter
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Walk to the cashier — your order will be waiting
                    </p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xl font-extrabold text-gray-900">Your Cart</span>
        <span className="w-8 h-8 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
          {count}
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 mt-4">
            <img
              src={emptyCartImg}
              alt="Empty cart"
              className="w-40 h-40 object-contain opacity-80"
            />
            <p className="text-gray-400 text-sm mt-2">No items added yet</p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 bg-white rounded-xl p-3"
            >
              <img
                src={getProductImage(item.media)}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-100"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = dishPlaceholder;
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-800 line-clamp-1">
                  {item.name}
                </p>
                <p className="text-xs text-gray-400">
                  ${item.price.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDecrease(item.id)}
                  className="w-6 h-6 rounded-md bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                >
                  <Minus size={10} />
                </button>
                <span className="w-5 text-center text-sm font-bold">
                  {item.qty}
                </span>
                <button
                  onClick={() => onIncrease(item.id)}
                  className="w-6 h-6 rounded-md bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                >
                  <Plus size={10} />
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  className="w-6 h-6 rounded-md bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors ml-1"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-400 text-xs">
            <span>Tax (10%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-3xl font-extrabold" style={{ color: "#B5E533" }}>
          ${total.toFixed(2)}
        </p>

        {/* SAME position: cashier is right next to the kiosk — no assist button needed.
            DISTANCE: customer must walk to POS counter.                              */}
        {position === "DISTANCE" && (
          <button
            onClick={() => setShowAssistDialog(true)}
            disabled={cartItems.length === 0 || !isConnected || isBeingAssisted}
            className="w-full py-3 rounded-full text-black font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all duration-200 hover:opacity-80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: "#B5E533" }}
          >
            <MonitorUp size={30} />
            {isBeingAssisted ? "Cashier is helping you" : "Move to POS Counter"}
          </button>
        )}

        <button
          onClick={() =>
            navigate("/kiosk/payment", {
              state: {
                cartItems,
                total,
                orderId: activeOrder?.orderId ?? null,
              },
            })
          }
          className="w-full py-4 rounded-full text-black font-extrabold text-base transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#B5E533" }}
          disabled={cartItems?.length === 0 || isBeingAssisted}
        >
          {assistanceHandedBack ? "Proceed to Payment" : "Complete order"}
        </button>
      </div>
    </div>
  );
}
