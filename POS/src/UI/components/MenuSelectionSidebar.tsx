import {
  Home,
  ShoppingBag,
  UtensilsCrossed,
  Wallet,
  History,
  Tag,
  FileText,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { useState } from "react";
import userPng from "@/assets/user.png";
const navItems = [
  { icon: Home, label: "Home", id: "home" },
  { icon: ShoppingBag, label: "Order", id: "order" },
  { icon: UtensilsCrossed, label: "Menu", id: "menu" },
  { icon: Wallet, label: "Wallet", id: "wallet" },
  { icon: History, label: "History", id: "history" },
  { icon: Tag, label: "Promos", id: "promos" },
  { icon: FileText, label: "Bills", id: "bills" },
  { icon: Settings, label: "Setting", id: "setting" },
];

export default function MenuSelectionSidebar() {
  const [active, setActive] = useState("order");
  const [dark, setDark] = useState(false);

  return (
    <aside className="w-[10%] min-w-40 h-full bg-white border-r border-gray-100 flex flex-col items-center py-4 gap-2">
      <div className="flex flex-col items-center mb-4">
        <div className="w-10 h-10 rounded-2xl overflow-hidden mb-2">
          <img
            src={userPng}
            alt="cashier"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-sm font-bold text-gray-800 text-center">Jhone Doe</p>
      </div>

      <nav className="w-full flex flex-col items-center gap-1 px-2">
        {navItems.map(({ icon: Icon, label, id }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`w-full flex flex-col items-center gap-0.5 py-2 px-2 rounded-xl transition-all text-xs font-medium
              ${
                active === id
                  ? "bg-green-500 text-white shadow-md shadow-green-200"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex gap-2">
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
