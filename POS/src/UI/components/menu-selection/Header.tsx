import { Search, Bell, QrCode } from "lucide-react";
import IncomingOrderBadge from "../order/IncomingOrderBadge";

export default function Header() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-2 ml-auto">
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search Categories or Menu..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition"
          />
        </div>
        <button className="w-9 h-9 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
          <Search className="w-4 h-4" />
        </button>
        <button className="w-9 h-9 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
          <QrCode className="w-4 h-4" />
        </button>
        <button className="w-9 h-9 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
          <Bell className="w-4 h-4" />
        </button>
        <IncomingOrderBadge />
      </div>

      <div className="text-right min-w-25">
        <p className="text-sm font-bold text-gray-800">Order #123</p>
        <p className="text-xs text-gray-400">Opened 8:00am</p>
      </div>
    </header>
  );
}
