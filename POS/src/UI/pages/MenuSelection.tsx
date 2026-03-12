import { useEffect, useRef, useState } from "react";
import Header from "../components/menu-selection/Header";
import Products from "../components/menu-selection/Products";
import CartSidebar, {
  type CartItem,
} from "../components/menu-selection/CartSidebar";
import CategoryTab from "../components/menu-selection/CategoryTab";
import ProductGroupTab from "../components/menu-selection/ProductGroupTab";
import KioskSentBanner from "../components/menu-selection/KioskSentBanner";
import DisconnectedWatermark from "../components/common/DisconnectedWatermark";
import type { Product } from "@/types/product";
import { useOrder } from "@/context/OrderContext";
import { enrichLineItems } from "@/utils/enrichLineItems";

export default function MenuSelection() {
  const {
    activeOrder,
    isConnected,
    updateOrder,
    addItemToOrder,
    removeItemFromOrder,
    changeItemQty,
    lastCompletedOrder,
    stashWalkupCart,
    popWalkupCart,
  } = useOrder();

  const isAssistanceMode =
    activeOrder !== null && activeOrder.originTerminal.type === "KIOSK";
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
      const next = prev.map((i) =>
        i.id === id ? { ...i, qty: i.qty + 1 } : i,
      );
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
    <>
      <KioskSentBanner onRecall={(items) => setCartItems(items)} />

      {activeOrder && (
        <div className="bg-warning-subtle border-b border-warning px-6 py-2 flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-warning">
            {activeOrder.originTerminal.type === "KIOSK"
              ? `Assisting customer · Order #${activeOrder.orderNumber} — changes sync to KIOSK in real-time`
              : `Editing order #${activeOrder.orderNumber} — changes sync to KIOSK in real-time`}
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Center: group tabs on top, then category + products */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          {/* Product group tabs — top */}
          <div className="px-4 pt-3 pb-2 border-b border-subtle bg-surface-raised">
            <ProductGroupTab />
          </div>

          {/* Category (left) + Products (right) */}
          <div className="flex flex-1 overflow-hidden relative">
            <CategoryTab />
            <Products onAdd={handleAdd} />
            {!isConnected && <DisconnectedWatermark />}
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
    </>
  );
}
