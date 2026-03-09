import { mockCombinations } from "../../data/mockCombinations";
import type { OrderLineItem } from "@/types/order";
import type { CartItem } from "@/UI/components/menu-selection/CartSidebar";

const allProducts = mockCombinations.flatMap((g) =>
  g.categories.flatMap((c) => c.products),
);

/**
 * Map OrderLineItem[] → CartItem[], enriching each item with product fields
 * (media, code, description, etc.) looked up from the local product catalog.
 * Falls back to sensible defaults when the product isn't found.
 */
export function enrichLineItems(items: OrderLineItem[]): CartItem[] {
  return items.map((li) => {
    const product = allProducts.find((p) => p.id === li.productId);
    return {
      id: li.productId,
      name: li.name,
      price: li.price,
      qty: li.qty,
      active: product?.active ?? true,
      sort_order: product?.sort_order ?? 0,
      media: product?.media ?? "",
      code: product?.code ?? "",
      description: product?.description ?? null,
      category_id: product?.category_id ?? "",
      is_sold_out: product?.is_sold_out ?? 0,
      overrides: product?.overrides ?? "",
      is_product_tag: product?.is_product_tag ?? false,
      barcodes: product?.barcodes ?? "",
    };
  });
}
