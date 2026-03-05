import { useEffect, useState } from "react";
import Header from "../components/Header";
import MenuSelectionSidebar from "../components/MenuSelectionSidebar";
import Products from "../components/Products";
import CartSidebar, { type CartItem } from "../components/CartSidebar";
import CategoryTab from "../components/CategoryTab";
import ProductGroupTab from "../components/ProductGroupTab";
import { ProductProvider } from "@/context/ProductContext";
import type { Product } from "@/types/product";
import { useOrder } from "@/context/OrderContext";

export default function MenuSelection() {
  const { activeOrder, updateOrder, lastCompletedOrder } = useOrder();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Reset cart when a WS-based order completes (cashier claimed kiosk order)
  useEffect(() => {
    if (lastCompletedOrder) setCartItems([]);
  }, [lastCompletedOrder]);

  // Pre-populate cart if a KIOSK order was claimed
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
        ? prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, { ...product, qty: 1 }];
      syncIfActive(next);
      return next;
    });
  };

  const handleIncrease = (id: string) => {
    setCartItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
      syncIfActive(next);
      return next;
    });
  };

  const handleDecrease = (id: string) => {
    setCartItems((prev) => {
      const next = prev.map((i) => i.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i);
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
      <div className="flex flex-col h-screen bg-gray-50 font-sans">
        <Header />
        {activeOrder && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 text-sm font-semibold text-yellow-800">
            Editing order #{activeOrder.orderNumber} — changes sync to KIOSK in real-time
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
