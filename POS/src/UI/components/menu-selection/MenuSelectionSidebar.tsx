import {
  // Home,
  ShoppingBag,
  UtensilsCrossed,
  Wallet,
  History,
  Tag,
  FileText,
  Settings,
  Moon,
  Sun,
  PauseCircle,
  Bell,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import userPng from "@/assets/user.png";
import { useOrder } from "@/context/OrderContext";

const navItems = [
  // { icon: Home,          label: "Home",    id: "home",    path: "/"        },
  { icon: UtensilsCrossed, label: "Menu", id: "menu", path: "/" },
  { icon: ShoppingBag, label: "Orders", id: "orders", path: "/orders" },
  { icon: Bell, label: "Incoming", id: "incoming", path: "/incoming" },
  { icon: PauseCircle, label: "Hold", id: "held-orders", path: "/held-orders" },
  { icon: Wallet, label: "Wallet", id: "wallet", path: null },
  { icon: History, label: "History", id: "history", path: null },
  { icon: Tag, label: "Promos", id: "promos", path: null },
  { icon: FileText, label: "Bills", id: "bills", path: null },
  { icon: Settings, label: "Setting", id: "setting", path: "/settings" },
];

interface Props {
  activeNav?: string;
}

export default function MenuSelectionSidebar({ activeNav }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, setDark] = useState(false);
  const { incomingOrders } = useOrder();
  const incomingCount = incomingOrders.length;

  function resolveActive(id: string, path: string | null) {
    if (activeNav) return activeNav === id;
    if (path === "/") return location.pathname === "/";
    if (path) return location.pathname.startsWith(path);
    return false;
  }

  return (
    <aside className="w-14 md:w-[10%] md:min-w-40 h-full bg-white border-r border-gray-100 flex flex-col items-center py-4 gap-2 shrink-0">
      {/* Restaurant logo */}
      <div className="hidden md:flex flex-col items-center mb-1 px-2">
        <span className="text-xl font-extrabold text-center leading-tight">
          <span className="text-gray-800">Res</span>
          <span className="text-green-500">t</span>
          <span className="text-gray-800">aurant</span>
        </span>
        <p className="text-[10px] text-gray-400 font-medium tracking-wide">
          POS System
        </p>
      </div>
      <div className="w-3/4 h-px bg-gray-100 mb-1" />

      {/* Cashier */}
      <div className="flex flex-col items-center mb-4">
        <div className="w-8 h-8 rounded-2xl overflow-hidden mb-2">
          <img
            src={userPng}
            alt="cashier"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="hidden md:block text-sm font-bold text-gray-800 text-center">
          Jhone Doe
        </p>
      </div>

      <nav className="w-full flex flex-col items-center gap-1 px-2">
        {navItems.map(({ icon: Icon, label, id, path }) => {
          const isActive = resolveActive(id, path);
          const count = id === "incoming" ? incomingCount : 0;
          return (
            <button
              key={id}
              onClick={() => path && navigate(path)}
              title={label}
              className={`relative w-full flex flex-col items-center gap-0.5 py-2 px-2 rounded-xl transition-all text-xs font-medium
                ${
                  isActive
                    ? "bg-green-500 text-white shadow-md shadow-green-200"
                    : path
                      ? "text-gray-500 hover:bg-gray-100"
                      : "text-gray-300 cursor-not-allowed"
                }`}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </span>
              <span className="hidden md:block">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="hidden md:flex gap-2 mt-auto">
        <button
          onClick={() => setDark(false)}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition
            ${!dark ? "border-gray-300 bg-gray-100 text-gray-700" : "border-transparent text-gray-400"}`}
        >
          <Moon className="w-3 h-3" /> Dark
        </button>
        <button
          onClick={() => setDark(true)}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition
            ${dark ? "border-gray-300 bg-gray-100 text-gray-700" : "border-transparent text-gray-400"}`}
        >
          <Sun className="w-3 h-3" /> Light
        </button>
      </div>
    </aside>
  );
}
