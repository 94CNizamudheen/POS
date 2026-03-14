import { useNavigate, useLocation } from "react-router-dom";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import type { CartItem } from "@/types/product";
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

export default function Cart() {
  const navigate = useNavigate();
  const location = useLocation();

  // Cart state passed via router state
  const cartItems: CartItem[] =
    (location.state as { cartItems?: CartItem[] })?.cartItems ?? [];
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/kiosk/menu")}
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-xl text-gray-800">Review Order</h1>
      </div>

      {cartItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
          <ShoppingBag size={64} strokeWidth={1} />
          <p className="text-lg">Your cart is empty</p>
          <button
            onClick={() => navigate("/kiosk/menu")}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Browse Menu
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Items list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm"
              >
                <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0 overflow-hidden">
                  <img
                    src={getProductImage(item.media)}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = dishPlaceholder;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 line-clamp-1">
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-400">
                    ${item.price.toFixed(2)} each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-lg bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center transition-colors">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-800">
                    {item.qty}
                  </span>
                  <button className="w-8 h-8 rounded-lg bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center transition-colors">
                    <Plus size={14} />
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors ml-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <span className="font-bold text-green-500 text-base w-16 text-right">
                  ${(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-white border-t border-gray-100 px-6 py-5 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tax (10%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 text-lg pt-2 border-t border-gray-100">
                <span>Total</span>
                <span className="text-green-500">${total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() =>
                navigate("/kiosk/payment", { state: { cartItems, total } })
              }
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl text-lg transition-all duration-200 shadow-md shadow-green-100"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
