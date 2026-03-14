import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  cartCount?: number;
  showCart?: boolean;
}

export default function Header({ cartCount = 0, showCart = false }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        <div>
          <p className="font-bold text-gray-800 text-lg leading-tight">FoodKiosk</p>
          <p className="text-xs text-gray-400">Self Order Station</p>
        </div>
      </div>

      {/* Cart button */}
      {showCart && (
        <button
          onClick={() => navigate("/kiosk/menu")}
          className="relative flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md shadow-green-100"
        >
          <ShoppingCart size={20} />
          <span>View Cart</span>
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </button>
      )}
    </header>
  );
}
