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
    <header className="h-14 bg-surface-raised border-b border-default flex items-center px-6 gap-3 sticky top-0 z-50 shadow-sm">
      {/* Search — takes all remaining width */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Categories or Menu..."
          className="input-field pl-9 pr-8 py-2 focus:border-success"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Fixed-width action buttons */}
      <button className="w-9 h-9 shrink-0 flex items-center justify-center bg-success text-white rounded-lg hover:bg-success transition">
        <Search className="w-4 h-4" />
      </button>
      <button className="w-9 h-9 shrink-0 flex items-center justify-center bg-success text-white rounded-lg hover:bg-success transition">
        <QrCode className="w-4 h-4" />
      </button>

      {/* Notification bell */}
      <div ref={bellRef} className="relative shrink-0">
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center bg-success text-white rounded-lg hover:bg-success transition"
          >
            <Bell className="w-4 h-4" />
            {totalCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-11 w-72 bg-surface-raised rounded-2xl shadow-xl border border-subtle overflow-hidden z-50">
              <div className="px-4 py-2.5 border-b border-subtle flex items-center justify-between">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Notifications
                </span>
                {totalCount > 0 && (
                  <span className="text-[10px] font-semibold text-muted">
                    {totalCount} new
                  </span>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-subtle">
                {/* Incoming orders */}
                {incomingOrders.map((order) => (
                  <button
                    key={order.orderId}
                    onClick={() => {
                      setShowNotifications(false);
                      navigate("/pos/incoming");
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface transition text-left"
                  >
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-success shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">
                        New order #{order.orderNumber}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
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
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface transition text-left"
                  >
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-warning shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary">
                        {notification}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Tap to dismiss
                      </p>
                    </div>
                    <X className="w-3.5 h-3.5 text-disabled shrink-0 mt-0.5" />
                  </button>
                )}

                {totalCount === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted">
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
    </header>
  );
}
