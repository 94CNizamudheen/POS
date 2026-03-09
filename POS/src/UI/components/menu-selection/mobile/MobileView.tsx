import { useEffect, useRef, useState } from "react";
import { Search, Bell, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/context/ProductContext";
import { useOrder } from "@/context/OrderContext";
import { useClickOutside } from "@/hooks/useClickOutside";
import { enrichLineItems } from "@/utils/enrichLineItems";
import type { Product } from "@/types/product";
import type { CartItem } from "../CartSidebar";
import MobileProductCard from "./MobileProductCard";
import MobileCategoryTabs from "./MobileCategoryTabs";
import MobileProductGroupTabs from "./MobileProductGroupTabs";
import MobileBottomCartBar from "./MobileBottomCartBar";
import MobileCartDrawer from "./MobileCartDrawer";
import KioskSentBanner from "../KioskSentBanner";
import MenuSelectionSidebarMobile from "./MenuSelectionSidebarMobile";
import DisconnectedWatermark from "@/UI/components/common/DisconnectedWatermark";

export default function MobileView() {
  const { filteredProducts, searchQuery, setSearchQuery } = useProducts();
  const {
    activeOrder,
    updateOrder,
    addItemToOrder,
    removeItemFromOrder,
    changeItemQty,
    lastCompletedOrder,
    stashWalkupCart,
    popWalkupCart,
    incomingOrders,
    notification,
    clearNotification,
    isConnected,
  } = useOrder();

  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const bellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const cartItemsRef = useRef<CartItem[]>(cartItems);
  cartItemsRef.current = cartItems;
  const activeOrderRef = useRef(activeOrder);
  activeOrderRef.current = activeOrder;

  useClickOutside(bellRef, () => setShowNotifications(false));
  useClickOutside(searchRef, () => setShowSearch(false));

  const isAssistanceMode =
    activeOrder !== null && activeOrder.originTerminal.type === "KIOSK";

  const totalCount = incomingOrders.length + (notification ? 1 : 0);

  // Restore stashed walkup cart on mount
  useEffect(() => {
    const restored = popWalkupCart();
    if (restored.length > 0 && !activeOrderRef.current) {
      setCartItems(restored);
    }
    return () => {
      if (!activeOrderRef.current && cartItemsRef.current.length > 0) {
        stashWalkupCart(cartItemsRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset cart when WS order completes
  useEffect(() => {
    if (lastCompletedOrder) setCartItems([]);
  }, [lastCompletedOrder]);

  // Clear cart when active order released
  const prevActiveOrderId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevActiveOrderId.current;
    const curr = activeOrder?.orderId;
    if (prev && !curr) setCartItems([]);
    prevActiveOrderId.current = curr;
  }, [activeOrder?.orderId]);

  // Pre-populate cart when KIOSK order claimed
  useEffect(() => {
    if (!activeOrder) return;
    const mapped = enrichLineItems(activeOrder.items);
    if (mapped.length > 0) setCartItems(mapped);
  }, [activeOrder?.orderId]);

  function syncIfActive(next: CartItem[]) {
    if (activeOrder && !isAssistanceMode)
      updateOrder(activeOrder.orderId, next);
  }

  const handleAdd = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      const next = existing
        ? prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { ...product, qty: 1 }];
      if (isAssistanceMode && activeOrder) {
        if (existing) {
          changeItemQty(activeOrder.orderId, product.id, existing.qty + 1);
        } else {
          addItemToOrder(activeOrder.orderId, {
            productId: product.id,
            name: product.name,
            price: product.price,
            qty: 1,
            subtotal: product.price,
          });
        }
      } else {
        syncIfActive(next);
      }
      return next;
    });
  };

  const handleIncrease = (id: string) => {
    setCartItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
      if (isAssistanceMode && activeOrder) {
        const item = next.find((i) => i.id === id);
        if (item) changeItemQty(activeOrder.orderId, id, item.qty);
      } else {
        syncIfActive(next);
      }
      return next;
    });
  };

  const handleDecrease = (id: string) => {
    setCartItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const newQty = Math.max(1, item.qty - 1);
      const next = prev.map((i) => (i.id === id ? { ...i, qty: newQty } : i));
      if (isAssistanceMode && activeOrder) {
        changeItemQty(activeOrder.orderId, id, newQty);
      } else {
        syncIfActive(next);
      }
      return next;
    });
  };

  const handleRemove = (id: string) => {
    setCartItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (isAssistanceMode && activeOrder) {
        removeItemFromOrder(activeOrder.orderId, id);
      } else {
        syncIfActive(next);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">
      <KioskSentBanner onRecall={(items) => setCartItems(items)} />

      {/* Fixed top header */}
      <header className="bg-white border-b border-gray-100 shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-2 px-4 h-14">
          {/* Menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand */}
          <div className="flex-1 min-w-0">
            <span className="text-base font-extrabold leading-none">
              <span className="text-gray-800">Res</span>
              <span className="text-green-500">t</span>
              <span className="text-gray-800">aurant</span>
            </span>
          </div>

          {/* Search toggle */}
          <div ref={searchRef} className="relative">
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="w-9 h-9 flex items-center justify-center bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
            >
              <Search className="w-4 h-4" />
            </button>
            {showSearch && (
              <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search menu..."
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
              </div>
            )}
          </div>

          {/* Notification bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative w-9 h-9 flex items-center justify-center bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
            >
              <Bell className="w-4 h-4" />
              {totalCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {totalCount}
                </span>
              )}
            </button>

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
                  {notification && (
                    <button
                      onClick={() => {
                        clearNotification();
                        setShowNotifications(false);
                      }}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                    >
                      <span className="mt-0.5 w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
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

        {/* Active order banner */}
        {activeOrder && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2">
            <p className="text-xs font-semibold text-yellow-800">
              {activeOrder.originTerminal.type === "KIOSK"
                ? `Assisting customer · Order #${activeOrder.orderNumber}`
                : `Editing order #${activeOrder.orderNumber}`}
            </p>
          </div>
        )}
      </header>

      {/* Sticky tabs */}
      <div className="bg-white border-b border-gray-100 z-20 shrink-0">
        <MobileProductGroupTabs />
        <MobileCategoryTabs />
      </div>

      {/* Scrollable product grid */}
      <div className="flex-1 overflow-y-auto pb-24 relative">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 p-3">
            {filteredProducts.map((product) => (
              <MobileProductCard
                key={product.id}
                product={product}
                onAdd={handleAdd}
              />
            ))}
          </div>
        ) : (
          <p className="text-center py-10 text-gray-400 text-sm">
            No products found
          </p>
        )}
        {!isConnected && <DisconnectedWatermark />}
      </div>

      {/* Bottom cart bar */}
      <MobileBottomCartBar items={cartItems} onOpen={() => setCartOpen(true)} />

      {/* Cart drawer */}
      <MobileCartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onIncrease={handleIncrease}
        onDecrease={handleDecrease}
        onRemove={handleRemove}
        onClearCart={() => setCartItems([])}
      />

      {/* Sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-[80%] max-w-xs h-full shadow-2xl">
            <MenuSelectionSidebarMobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
