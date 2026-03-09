import {
  UtensilsCrossed,
  ShoppingBag,
  Bell,
  PauseCircle,
  Wallet,
  History,
  Tag,
  FileText,
  Settings,
  ChevronRight,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOrder } from "@/context/OrderContext";
import userPng from "@/assets/user.png";

const navItems = [
  { icon: UtensilsCrossed, label: "Menu", id: "menu", path: "/" },
  { icon: ShoppingBag, label: "Orders", id: "orders", path: "/orders" },
  { icon: Bell, label: "Incoming", id: "incoming", path: "/incoming" },
  { icon: PauseCircle, label: "Hold", id: "held-orders", path: "/held-orders" },
  { icon: Wallet, label: "Wallet", id: "wallet", path: null },
  { icon: History, label: "History", id: "history", path: null },
  { icon: Tag, label: "Promos", id: "promos", path: null },
  { icon: FileText, label: "Bills", id: "bills", path: null },
  { icon: Settings, label: "Settings", id: "setting", path: "/settings" },
];

interface MenuSelectionSidebarMobileProps {
  onClose: () => void;
}

export default function MenuSelectionSidebarMobile({
  onClose,
}: MenuSelectionSidebarMobileProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { incomingOrders } = useOrder();
  const incomingCount = incomingOrders.length;

  function isActive(id: string, path: string | null) {
    if (path === "/") return location.pathname === "/";
    if (path) return location.pathname.startsWith(path);
    return false;
  }

  function handleNav(path: string | null) {
    if (!path) return;
    navigate(path);
    onClose();
  }

  return (
    <div className="h-full w-full bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <span className="text-lg font-extrabold">
          <span className="text-gray-800">Res</span>
          <span className="text-green-500">t</span>
          <span className="text-gray-800">aurant</span>
        </span>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User info */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-gray-100">
          <img
            src={userPng}
            alt="cashier"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">Jhone Doe</p>
          <p className="text-xs text-gray-400">Cashier</p>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5">
        {navItems.map(({ icon: Icon, label, id, path }) => {
          const active = isActive(id, path);
          const badge = id === "incoming" ? incomingCount : 0;
          const disabled = !path;

          return (
            <button
              key={id}
              onClick={() => handleNav(path)}
              disabled={disabled}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.98] ${
                active
                  ? "bg-green-50 border border-green-200"
                  : disabled
                    ? "opacity-40 cursor-not-allowed bg-gray-50"
                    : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              {/* Icon */}
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  active ? "bg-green-500" : "bg-white border border-gray-200"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${active ? "text-white" : "text-gray-500"}`}
                />
              </div>

              {/* Label */}
              <span
                className={`flex-1 text-sm font-medium text-left ${
                  active ? "text-green-700 font-semibold" : "text-gray-700"
                }`}
              >
                {label}
              </span>

              {/* Badge */}
              {badge > 0 && (
                <span className="min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}

              {/* Chevron */}
              {!disabled && (
                <ChevronRight
                  className={`w-4 h-4 shrink-0 ${active ? "text-green-400" : "text-gray-300"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer — POS info */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">POS System v1.0</p>
      </div>
    </div>
  );
}
