import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mockCombinations } from "@data/mockCombinations";
import promoVideo from "@assets/barbecue-restaurant-menu-food-promo-sale.mp4";
import type { CartItem, Product } from "@/types/product";
import CartSidebar from "@ui/kiosk/components/CartSidebar";
import PosOrderBanner from "@ui/kiosk/components/PosOrderBanner";
import { useOrder } from "@/context/kiosk/OrderContext";
import { CategoryCard } from "@ui/kiosk/components/CategoryCard";
import { ProductCard } from "@ui/kiosk/components/ProductCard";
import { Watermark } from "@ui/kiosk/components/Watermark";
import { useApp } from "@/context/kiosk/AppContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "home" | "category";

interface SelectedCategory {
  id: string;
  name: string;
  groupId: string;
}

// ─── Main Menu ────────────────────────────────────────────────────────────────

export default function Menu() {
  const { activeOrder, updateOrder, assistanceHandedBack } = useOrder();
  const { syncCart } = useApp();
  const showWatermark =
    activeOrder?.status === "IN_PROGRESS" && !assistanceHandedBack;
  const navigate = useNavigate();
  const [view, setView] = useState<View>("home");
  const [selectedCat, setSelectedCat] = useState<SelectedCategory | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Keep AppContext's cartRef in sync so PULL_KIOSK_CART has the latest items
  useEffect(() => { syncCart(cartItems); }, [cartItems, syncCart]);

  // Re-sync cart in real-time when cashier modifies items during assistance
  useEffect(() => {
    if (activeOrder?.status !== "IN_PROGRESS") return;
    const allProducts = mockCombinations.flatMap((g) =>
      g.categories.flatMap((c) => c.products),
    );
    const mapped: CartItem[] = activeOrder.items.map((li) => {
      const product = allProducts.find((p) => p.id === li.productId);
      return {
        id: li.productId,
        name: li.name,
        price: li.price,
        qty: li.qty,
        code: product?.code ?? "",
        description: product?.description ?? null,
        category_id: product?.category_id ?? "",
        active: product?.active ?? true,
        sort_order: product?.sort_order ?? 0,
        is_sold_out: product?.is_sold_out ?? 0,
        media: product?.media ?? "",
        overrides: product?.overrides ?? "",
        is_product_tag: product?.is_product_tag ?? false,
        barcodes: product?.barcodes ?? "",
      };
    });
    setCartItems(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrder?.items]);

  // Pre-populate cart from a POS-assigned order
  useEffect(() => {
    if (!activeOrder) return;
    const mapped: CartItem[] = activeOrder.items.map((li) => {
      const allProducts = mockCombinations.flatMap((g) =>
        g.categories.flatMap((c) => c.products),
      );
      const product = allProducts.find((p) => p.id === li.productId);
      return {
        id: li.productId,
        name: li.name,
        price: li.price,
        qty: li.qty,
        code: product?.code ?? "",
        description: product?.description ?? null,
        category_id: product?.category_id ?? "",
        active: product?.active ?? true,
        sort_order: product?.sort_order ?? 0,
        is_sold_out: product?.is_sold_out ?? 0,
        media: product?.media ?? "",
        overrides: product?.overrides ?? "",
        is_product_tag: product?.is_product_tag ?? false,
        barcodes: product?.barcodes ?? "",
      };
    });
    if (mapped.length > 0) setCartItems(mapped);
  }, [activeOrder?.orderId]);

  const allCategories = mockCombinations.flatMap((g) =>
    g.categories.map((c) => ({ ...c, groupId: g.id, products: c.products })),
  );

  const currentProducts = selectedCat
    ? (
        allCategories.find((c) => c.id === selectedCat.id)?.products ?? []
      ).filter((p) => p.active && !p.is_sold_out)
    : [];

  function handleAdd(product: Product) {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing)
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [...prev, { ...product, qty: 1 }];
    });
  }
  function syncIfActive(updated: CartItem[]) {
    if (activeOrder) updateOrder(activeOrder.orderId, updated);
  }

  function handleIncrease(id: string) {
    setCartItems((prev) => {
      const next = prev.map((i) =>
        i.id === id ? { ...i, qty: i.qty + 1 } : i,
      );
      syncIfActive(next);
      return next;
    });
  }
  function handleDecrease(id: string) {
    setCartItems((prev) => {
      const next = prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0);
      syncIfActive(next);
      return next;
    });
  }
  function handleRemove(id: string) {
    setCartItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      syncIfActive(next);
      return next;
    });
  }

  function selectCategory(cat: { id: string; name: string; groupId: string }) {
    setSelectedCat(cat);
    setView("category");
  }

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  return (
    <div
      className="relative h-screen w-screen flex overflow-hidden p-3 gap-3"
      style={{ backgroundColor: "#D8D8D3" }}
    >
      <PosOrderBanner />
      {activeOrder && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-6 py-2 rounded-full text-sm font-bold text-black shadow-lg"
          style={{ backgroundColor: "#B5E533" }}
        >
          Continuing order #{activeOrder.orderNumber} from cashier
        </div>
      )}
      {view === "home" ? (
        <>
          {/* ── LEFT: Categories (50%) ── */}
          <div
            className="w-1/2 rounded-3xl flex flex-col p-6 overflow-y-auto shrink-0"
            style={{ backgroundColor: "#FFFFFF" }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between mb-5">
              <span
                className="text-3xl"
                style={{ fontFamily: "'Pacifico', cursive", color: "#1C1C1C" }}
              >
                Delicious
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 rounded-full border-2 border-gray-900 text-gray-900 font-bold text-sm hover:bg-gray-100 transition-colors"
                >
                  ← Back
                </button>
                <span className="w-8 h-8 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
            </div>

            <h2 className="text-3xl font-extrabold text-gray-900 mb-0.5">
              Hey,
            </h2>
            <p className="text-2xl font-extrabold text-gray-900 mb-5">
              What's up ?
            </p>

            {/* Category grid — 3 cols */}
            <div className="grid grid-cols-3 gap-3">
              {allCategories.map((cat, i) => (
                <CategoryCard
                  key={cat.id}
                  name={cat.name}
                  media={cat.media}
                  badge={i === 0 ? "20% off" : undefined}
                  onClick={() =>
                    selectCategory({
                      id: cat.id,
                      name: cat.name,
                      groupId: cat.groupId,
                    })
                  }
                />
              ))}
            </div>
          </div>

          {/* ── CENTER: Promo (22%) ── */}
          <div className="w-[22%] rounded-3xl overflow-hidden flex flex-col shrink-0">
            {/* Green promo banner */}
            <div
              className="flex-1 flex flex-col justify-center px-6 py-8"
              style={{ backgroundColor: "#B5E533" }}
            >
              <p className="text-white text-xl font-bold mb-1">Friends meal</p>
              <p
                className="text-black font-extrabold leading-none"
                style={{ fontSize: "clamp(3rem,6vw,5rem)" }}
              >
                20%
              </p>
              <p
                className="text-black font-extrabold mb-5"
                style={{ fontSize: "clamp(2rem,4vw,3.5rem)" }}
              >
                off
              </p>
              <button
                className="self-start px-6 py-2.5 rounded-full bg-black text-white font-bold text-sm hover:opacity-80 transition-opacity"
                onClick={() => {
                  const first = allCategories[0];
                  if (first)
                    selectCategory({
                      id: first.id,
                      name: first.name,
                      groupId: first.groupId,
                    });
                }}
              >
                Order now
              </button>
            </div>

            {/* Hero promo video */}
            <div className="flex-1 overflow-hidden">
              <video
                src={promoVideo}
                className="w-full h-full object-fill"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          </div>
        </>
      ) : (
        /* ── CATEGORY VIEW: Left+Center merged (72%) ── */
        <div
          className="flex-1 rounded-3xl flex flex-col p-6 overflow-y-auto"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <span
              className="text-3xl"
              style={{ fontFamily: "'Pacifico', cursive", color: "#1C1C1C" }}
            >
              Delicious
            </span>
            <button
              onClick={() => setView("home")}
              className="px-5 py-2 rounded-full border-2 border-gray-900 text-gray-900 font-bold text-sm hover:bg-gray-100 transition-colors"
            >
              Main menu?
            </button>
          </div>

          <h2 className="text-4xl font-extrabold text-gray-900 mb-6">
            {selectedCat?.name}
          </h2>

          {currentProducts.length === 0 ? (
            <p className="text-gray-400 text-lg mt-8">No items available</p>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {currentProducts.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={handleAdd} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Cashier-assist overlay: covers menu area, blocks all interaction ── */}
      {showWatermark && (
        <div
          className="absolute cursor-not-allowed"
          style={{
            top: "0.75rem",
            left: "0.75rem",
            bottom: "0.75rem",
            right: "calc(28% + 0.75rem)",
            zIndex: 20,
            backgroundColor: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(2px)",
            borderRadius: "1.5rem",
            pointerEvents: "all",
          }}
        >
          <Watermark />
        </div>
      )}

      {/* ── CART: Right (28%) ── */}
      <div
        className="w-[28%] rounded-3xl overflow-hidden shrink-0"
        style={{ backgroundColor: "#F1F1EC" }}
      >
        <CartSidebar
          cartItems={cartItems}
          onIncrease={handleIncrease}
          onDecrease={handleDecrease}
          onRemove={handleRemove}
        />
      </div>
    </div>
  );
}
