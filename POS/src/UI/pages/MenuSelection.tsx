import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import MenuSelectionSidebar from "../components/MenuSelectionSidebar";
import Products from "../components/Products";
import CartSidebar, { type CartItem } from "../components/CartSidebar";
import CategoryTab from "../components/CategoryTab";
import ProductGroupTab from "../components/ProductGroupTab";
import KioskSentBanner from "../components/KioskSentBanner";
import { ProductProvider } from "@/context/ProductContext";
import type { Product } from "@/types/product";
import { useOrder } from "@/context/OrderContext";

export default function MenuSelection() {
  const { activeOrder, updateOrder, lastCompletedOrder, stashWalkupCart, popWalkupCart, kioskAcceptedAt } = useOrder();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Refs so closures (mount/unmount effects) always see the latest values
  const cartItemsRef = useRef<CartItem[]>(cartItems);
  cartItemsRef.current = cartItems;
  const activeOrderRef = useRef(activeOrder);
  activeOrderRef.current = activeOrder;

  // On mount: restore any walk-up cart that was stashed before navigating away.
  // On unmount: stash the walk-up cart so CLAIM_ACK can hold it if the cashier claims.
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

  // Reset cart when a WS-based order completes
  useEffect(() => {
    if (lastCompletedOrder) setCartItems([]);
  }, [lastCompletedOrder]);

  // Reset cart when KIOSK customer accepts a POS-sent order
  useEffect(() => {
    if (kioskAcceptedAt > 0) setCartItems([]);
  }, [kioskAcceptedAt]);

  // Clear cart when active order is released (e.g. customer accepted on KIOSK)
  const prevActiveOrderIdForClear = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevActiveOrderIdForClear.current;
    const curr = activeOrder?.orderId;
    if (prev && !curr) {
      setCartItems([]);
    }
    prevActiveOrderIdForClear.current = curr;
  }, [activeOrder?.orderId]);

  // Pre-populate cart when a KIOSK order is claimed or resumed
  useEffect(() => {
    if (!activeOrder) return;
    const mapped: CartItem[] = activeOrder.items.map((li) => ({
      id: li.productId,
      name: li.name,
      price: li.price,
      qty: li.qty,
      active: true,
      sort_order: 0,
    }));
    if (mapped.length > 0) setCartItems(mapped);
  }, [activeOrder?.orderId]);

  function syncIfActive(next: CartItem[]) {
    if (activeOrder) updateOrder(activeOrder.orderId, next);
  }

  const handleAdd = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      const next = existing
        ? prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { ...product, qty: 1 }];
      syncIfActive(next);
      return next;
    });
  };

  const handleIncrease = (id: string) => {
    setCartItems((prev) => {
      const next = prev.map((i) =>
        i.id === id ? { ...i, qty: i.qty + 1 } : i,
      );
      syncIfActive(next);
      return next;
    });
  };

  const handleDecrease = (id: string) => {
    setCartItems((prev) => {
      const next = prev.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i,
      );
      syncIfActive(next);
      return next;
    });
  };

  const handleRemove = (id: string) => {
    setCartItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      syncIfActive(next);
      return next;
    });
  };

  return (
    <ProductProvider>
      <KioskSentBanner />
      <div className="flex flex-col h-screen bg-gray-50 font-sans">
        <Header />
        {activeOrder && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 text-sm font-semibold text-yellow-800">
            Editing order #{activeOrder.orderNumber} — changes sync to KIOSK in
            real-time
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Left nav sidebar */}
          <MenuSelectionSidebar />

          {/* Center: group tabs on top, then category + products */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Product group tabs — top */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 bg-white">
              <ProductGroupTab />
            </div>

            {/* Category (left) + Products (right) */}
            <div className="flex flex-1 overflow-hidden">
              <CategoryTab />
              <Products onAdd={handleAdd} />
            </div>
          </div>

          {/* Cart */}
          <CartSidebar
            items={cartItems}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            onRemove={handleRemove}
            onClearCart={() => setCartItems([])}
          />
        </div>
      </div>
    </ProductProvider>
  );
}
