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
  LogOut,
  ArrowLeftRight,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOrder } from "@/context/OrderContext";
import userPng from "@/assets/user.png";
import logoPng from "@/assets/Dine-in.png";
import SwitchDeviceModal from "@/UI/components/common/SwitchDeviceModal";

const navItems = [
  { icon: UtensilsCrossed, label: "Menu", id: "menu", path: "/pos" },
  { icon: ShoppingBag, label: "Orders", id: "orders", path: "/pos/orders" },
  { icon: Bell, label: "Incoming", id: "incoming", path: "/pos/incoming" },
  { icon: PauseCircle, label: "Hold", id: "held-orders", path: "/pos/held-orders" },
  { icon: Wallet, label: "Wallet", id: "wallet", path: null },
  { icon: History, label: "History", id: "history", path: null },
  { icon: Tag, label: "Promos", id: "promos", path: null },
  { icon: FileText, label: "Bills", id: "bills", path: null },
  { icon: Settings, label: "Settings", id: "setting", path: "/pos/settings" },
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
  const [switchOpen, setSwitchOpen] = useState(false);

  function isActive(_id: string, path: string | null) {
    if (path === "/pos") return location.pathname === "/pos";
    if (path) return location.pathname.startsWith(path);
    return false;
  }

  function handleNav(path: string | null) {
    if (!path) return;
    navigate(path);
    onClose();
  }

  return (
    <>
    <div className="h-full w-full bg-surface-raised flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
        <img src={logoPng} alt="Logo" className="w-9 h-9 object-contain" />
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-sunken text-muted hover:bg-surface-sunken transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User info */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-subtle">
        <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-surface-sunken">
          <img
            src={userPng}
            alt="cashier"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-primary">Jhone Doe</p>
          <p className="text-xs text-muted">Cashier</p>
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
                  ? "bg-success-subtle border border-success"
                  : disabled
                    ? "opacity-40 cursor-not-allowed bg-surface"
                    : "bg-surface hover:bg-surface-sunken"
              }`}
            >
              {/* Icon */}
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  active
                    ? "bg-success"
                    : "bg-surface-raised border border-default"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${active ? "text-white" : "text-muted"}`}
                />
              </div>

              {/* Label */}
              <span
                className={`flex-1 text-sm font-medium text-left ${
                  active ? "text-success font-semibold" : "text-secondary"
                }`}
              >
                {label}
              </span>

              {/* Badge */}
              {badge > 0 && (
                <span className="min-w-5 h-5 px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}

              {/* Chevron */}
              {!disabled && (
                <ChevronRight
                  className={`w-4 h-4 shrink-0 ${active ? "text-success" : "text-disabled"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Switch Device */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setSwitchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface hover:bg-surface-sunken border border-default transition-all active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
          </div>
          <span className="flex-1 text-sm font-semibold text-secondary text-left">Switch Device</span>
          <ChevronRight className="w-4 h-4 text-disabled" />
        </button>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-subtle flex items-center justify-between">
        <p className="text-xs text-muted">POS System v1.0</p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-xs font-semibold text-danger px-3 py-1.5 rounded-xl hover:bg-danger-subtle transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit
        </button>
      </div>
    </div>

    <SwitchDeviceModal
      open={switchOpen}
      onClose={() => setSwitchOpen(false)}
      currentDevice="pos"
    />
    </>
  );
}
