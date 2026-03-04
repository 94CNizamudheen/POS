import { useState } from "react";
import Header from "../components/Header";
import MenuSelectionSidebar from "../components/MenuSelectionSidebar";
import Products from "../components/Products";
import CartSidebar, { type CartItem } from "../components/CartSidebar";
import CategoryTab from "../components/CategoryTab";
import ProductGroupTab from "../components/ProductGroupTab";
import { ProductProvider } from "@/context/ProductContext";
import type { Product } from "@/types/product";

export default function MenuSelection() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const handleAdd = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing)
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const handleIncrease = (id: string) => {
    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)),
    );
  };

  const handleDecrease = (id: string) => {
    setCartItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i,
      ),
    );
  };

  const handleRemove = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <ProductProvider>
      <div className="flex flex-col h-screen bg-gray-50 font-sans">
        <Header />

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
          />
        </div>
      </div>
    </ProductProvider>
  );
}
