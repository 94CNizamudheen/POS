import { useRef } from "react";
import type { Product } from "@/types/product";
import templateImg from "@assets/dish-placeholder.jpg";
import { useAnimation } from "@/context/AnimationContext";

function getProductImage(media?: string): string {
  try {
    if (!media) return templateImg;
    const arr = JSON.parse(media);
    return arr?.[0]?.filepath || templateImg;
  } catch {
    return templateImg;
  }
}

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { triggerAnimation } = useAnimation();
  const imageUrl = getProductImage(product.media);

  const handleAdd = () => {
    if (cardRef.current) {
      triggerAnimation(cardRef.current, imageUrl);
    }
    onAdd(product);
  };

  return (
    <div
      ref={cardRef}
      onClick={handleAdd}
      className="bg-white rounded-2xl flex flex-col shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <img
        src={imageUrl}
        alt={product.name}
        className="w-full h-50 object-cover"
      />
      <div className="p-3 flex flex-col gap-2">
        <p className="text-sm font-bold text-gray-800 line-clamp-2">
          {product.name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-green-600">
            ${product.price.toFixed(2)}
          </span>
          <button
            className="px-3 py-1 text-xs font-bold rounded-lg bg-gray-200 text-gray-700 hover:bg-green-500 hover:text-white transition-all"
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
