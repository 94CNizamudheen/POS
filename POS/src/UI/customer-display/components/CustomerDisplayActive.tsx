import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { CustomerDisplayCartPayload, PromoMediaItem } from "@/types/customer-display";
import PromoSlideshow from "./PromoSlideshow";

interface Props {
  cart: CustomerDisplayCartPayload;
  promoMedia: PromoMediaItem[];
  logoUrl?: string | null;
}

export default function CustomerDisplayActive({ cart, promoMedia, logoUrl }: Props) {
  const { items, subtotal, charges, discounts, itemDiscounts, grandTotal, currencyCode } = cart;
  const cartListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cartListRef.current) {
      cartListRef.current.scrollTop = cartListRef.current.scrollHeight;
    }
  }, [items]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="fixed inset-0 bg-gray-950 p-8">
      <div className="h-full w-full grid grid-cols-[1.4fr_1fr] gap-8 rounded-3xl bg-gray-900/40 backdrop-blur-md shadow-2xl p-8">
        {/* Slideshow */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative h-full w-full rounded-2xl overflow-hidden bg-black/10 flex items-center justify-center"
        >
          <PromoSlideshow media={promoMedia} logoUrl={logoUrl} />
        </motion.div>

        {/* Order panel */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col h-full rounded-2xl bg-gray-950 shadow-inner overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-800 shrink-0">
            <h1 className="text-3xl font-bold text-white">Your Order</h1>
          </div>

          {/* Items list */}
          <div ref={cartListRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            {items.map((item, index) => {
              const promos = itemDiscounts?.[item.id] ?? [];
              const lineTotal = item.price * item.quantity;
              const totalItemDiscount = promos.reduce((s, p) => s + p.amount, 0);
              const discountedTotal = Math.max(0, lineTotal - totalItemDiscount);

              return (
                <div
                  key={item.id || index}
                  className="flex justify-between items-start p-4 bg-gray-800 rounded-xl border border-gray-700"
                >
                  <div className="flex gap-4 items-start flex-1 min-w-0">
                    <div className="bg-blue-600 text-white font-bold text-2xl min-w-14 h-14 flex items-center justify-center rounded-lg shrink-0">
                      {item.quantity}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-medium text-white">{item.name}</p>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.modifiers.map((mod, i) => (
                            <p key={i} className="text-sm text-gray-400">
                              + {mod.name} x{mod.qty}
                            </p>
                          ))}
                        </div>
                      )}
                      {promos.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {promos.map((promo) => (
                            <span
                              key={promo.caption}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium bg-green-900/40 text-green-400 border border-green-700"
                            >
                              % {promo.caption}
                              <span className="font-semibold">
                                -{currencyCode} {promo.amount.toFixed(2)}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 ml-4">
                    {totalItemDiscount > 0 ? (
                      <>
                        <span className="text-lg text-gray-500 line-through">
                          {currencyCode} {lineTotal.toFixed(2)}
                        </span>
                        <span className="text-xl font-bold text-green-400 whitespace-nowrap">
                          {currencyCode} {discountedTotal.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xl font-bold text-white whitespace-nowrap">
                        {currencyCode} {lineTotal.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="p-6 border-t-2 border-blue-600 bg-gray-900 space-y-3 shrink-0">
            <div className="flex justify-between text-xl text-gray-300">
              <span>Subtotal ({itemCount})</span>
              <span>
                {currencyCode} {subtotal.toFixed(2)}
              </span>
            </div>

            {charges
              .filter((c) => c.applied)
              .map((charge) => (
                <div key={charge.id} className="flex justify-between text-lg text-gray-400">
                  <span>{charge.name}</span>
                  <span>
                    +{currencyCode} {charge.amount.toFixed(2)}
                  </span>
                </div>
              ))}

            {discounts &&
              discounts.length > 0 &&
              discounts.map((d) => (
                <div
                  key={d.name}
                  className="flex justify-between text-lg text-green-400 font-medium"
                >
                  <span>% {d.name}</span>
                  <span>
                    -{currencyCode} {d.discountAmount.toFixed(2)}
                  </span>
                </div>
              ))}

            <hr className="border-gray-700" />

            <div className="flex justify-between text-3xl font-bold text-white">
              <span>Total</span>
              <span>
                {currencyCode} {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
