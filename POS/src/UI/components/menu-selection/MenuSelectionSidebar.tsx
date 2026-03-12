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
import { useNavigate, useLocation } from "react-router-dom";
import userPng from "@/assets/user.png";
import logoPng from "@/assets/Dine-in.png";
import { useOrder } from "@/context/OrderContext";
import { useTheme } from "@/context/ThemeContext";

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
  const { incomingOrders } = useOrder();
  const { theme, toggleTheme } = useTheme();
  const incomingCount = incomingOrders.length;

  function resolveActive(id: string, path: string | null) {
    if (activeNav) return activeNav === id;
    if (path === "/") return location.pathname === "/";
    if (path) return location.pathname.startsWith(path);
    return false;
  }

  return (
    <aside className="w-[7%] h-full bg-surface-raised border-r border-subtle flex flex-col items-center py-4 gap-2 shrink-0">
      {/* Logo */}
      <div className="flex flex-col items-center mb-1 px-2">
        <img src={logoPng} alt="Logo" className="w-10 h-10 object-contain" />
        <p className="text-[10px] text-muted font-medium tracking-wide mt-0.5">
          POS System
        </p>
      </div>
      <div className="w-3/4 h-px bg-subtle mb-1" />

      {/* Cashier */}
      <div className="flex flex-col items-center mb-4">
        <div className="w-8 h-8 rounded-2xl overflow-hidden mb-2">
          <img
            src={userPng}
            alt="cashier"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-xs font-bold text-primary text-center">Jhone Doe</p>
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
                    ? "bg-success text-white shadow-md"
                    : path
                      ? "text-muted hover:bg-surface-sunken"
                      : "text-disabled cursor-not-allowed"
                }`}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        {theme === "dark" ? (
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-strong bg-surface-sunken text-secondary hover:bg-surface-sunken transition"
          >
            <Sun className="w-3 h-3" /> Light
          </button>
        ) : (
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-strong bg-surface-sunken text-secondary hover:bg-surface-sunken transition"
          >
            <Moon className="w-3 h-3" /> Dark
          </button>
        )}
      </div>
    </aside>
  );
}
