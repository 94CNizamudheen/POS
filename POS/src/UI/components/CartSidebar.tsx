import { Minus, Plus, Banknote, CreditCard, Wallet } from "lucide-react";
import emptyCartImg from "@/assets/empty-cart.png";
import dishPlaceholder from "@/assets/dish-placeholder.jpg";
import type { Product } from "@/types/product";

export interface CartItem extends Product {
  qty: number;
}

interface CartSidebarProps {
  items: CartItem[];
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
}

const paymentMethods = [
  { icon: Banknote, label: "Cash" },
  { icon: CreditCard, label: "Debit Card" },
  { icon: Wallet, label: "E-Wallet" },
];

export default function CartSidebar({
  items,
  onIncrease,
  onDecrease,
  onRemove,
}: CartSidebarProps) {
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
    <aside className="w-[25%] min-w-60 h-full bg-white border-l border-gray-100 flex flex-col px-4 py-4 gap-3">
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
              src={item.media || dishPlaceholder}
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
          {paymentMethods.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-1 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:border-green-400 hover:bg-green-50 transition"
            >
              <Icon className="w-5 h-5 text-gray-500" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <button className="w-full py-3 bg-green-400 text-white font-bold rounded-xl hover:bg-green-500 transition text-sm shadow-md shadow-green-100">
        Place Order
      </button>
    </aside>
  );
}
