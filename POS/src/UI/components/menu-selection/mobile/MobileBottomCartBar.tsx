import { ShoppingCart, ChevronUp } from "lucide-react";
import type { CartItem } from "../CartSidebar";

interface MobileBottomCartBarProps {
  items: CartItem[];
  onOpen: () => void;
}

export default function MobileBottomCartBar({
  items,
  onOpen,
}: MobileBottomCartBarProps) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty * 1.1, 0);
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
      <button
        id="cart-button"
        onClick={onOpen}
        className="w-full bg-success text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-lg active:bg-success transition"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 min-w-4 h-4 px-0.5 bg-surface-raised text-success text-[9px] font-black rounded-full flex items-center justify-center">
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          </div>
          <span className="text-sm font-bold">View Cart</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">${total.toFixed(2)}</span>
          <ChevronUp className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
}
