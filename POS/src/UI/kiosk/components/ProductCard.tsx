import { Plus } from "lucide-react";
import menuTemplate from "@assets/dish-placeholder.jpg";
import type { Product } from "@/types/product";
import { getProductImage } from "@ui/kiosk/components/CategoryCard";

export function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (p: Product) => void;
}) {
  const img = getProductImage(product.media);
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
      style={{ backgroundColor: "#E5E5DF" }}
      onClick={() => onAdd(product)}
    >
      <div className="h-50 bg-gray-200 flex items-center justify-center overflow-hidden">
        <img
          src={img || menuTemplate}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3 flex items-end justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-gray-900 text-sm line-clamp-2 leading-tight">
            {product.name}
          </p>
          <p className="text-sm font-bold text-gray-600 mt-0.5">
            ${product.price.toFixed(2)}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(product);
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center text-black transition-colors hover:opacity-80 shrink-0"
          style={{ backgroundColor: "#B5E533" }}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
