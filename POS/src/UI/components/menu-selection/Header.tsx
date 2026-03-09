import { useRef, useState } from "react";
import { Search, Bell, QrCode, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/context/ProductContext";
import { useOrder } from "@/context/OrderContext";
import { useClickOutside } from "@/hooks/useClickOutside";

export default function Header() {
  const { searchQuery, setSearchQuery } = useProducts();
  const { incomingOrders, notification, clearNotification } = useOrder();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useClickOutside(bellRef, () => setShowNotifications(false));

  const totalCount = incomingOrders.length + (notification ? 1 : 0);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-2 ml-auto">
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Categories or Menu..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button className="w-9 h-9 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
          <Search className="w-4 h-4" />
        </button>
        <button className="w-9 h-9 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
          <QrCode className="w-4 h-4" />
        </button>

        {/* Notification bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            <Bell className="w-4 h-4" />
            {totalCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Notifications
                </span>
                {totalCount > 0 && (
                  <span className="text-[10px] font-semibold text-gray-400">
                    {totalCount} new
                  </span>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {/* Incoming orders */}
                {incomingOrders.map((order) => (
                  <button
                    key={order.orderId}
                    onClick={() => {
                      setShowNotifications(false);
                      navigate("/incoming");
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                  >
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        New order #{order.orderNumber}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        From {order.originTerminal.terminalId} · $
                        {order.total.toFixed(2)}
                      </p>
                    </div>
                  </button>
                ))}

                {/* System notification */}
                {notification && (
                  <button
                    onClick={() => {
                      clearNotification();
                      setShowNotifications(false);
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                  >
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {notification}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Tap to dismiss
                      </p>
                    </div>
                    <X className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                  </button>
                )}

                {totalCount === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-right min-w-25">
        <p className="text-sm font-bold text-gray-800">Order #123</p>
        <p className="text-xs text-gray-400">Opened 8:00am</p>
      </div>
    </header>
  );
}
