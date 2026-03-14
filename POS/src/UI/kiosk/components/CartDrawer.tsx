import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CartItem } from "@/types/product";
import emptyCartImg from "@assets/empty-cart.png";
interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function CartDrawer({
  open,
  onClose,
  cartItems,
  onIncrease,
  onDecrease,
  onRemove,
}: CartDrawerProps) {
  const navigate = useNavigate();
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-95 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-lg">Your Order</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
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
                className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm line-clamp-1">
                    {item.name}
                  </p>
                  <p className="text-green-500 text-sm font-semibold">
                    ${(item.price * item.qty).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDecrease(item.id)}
                    className="w-7 h-7 rounded-lg bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-gray-800">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => onIncrease(item.id)}
                    className="w-7 h-7 rounded-lg bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors ml-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary + Checkout */}
        {cartItems.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tax (10%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-100">
                <span>Total</span>
                <span className="text-green-500">${total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                navigate("/kiosk/menu");
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-md shadow-green-100"
            >
              Review Order
            </button>
          </div>
        )}
      </div>
    </>
  );
}
