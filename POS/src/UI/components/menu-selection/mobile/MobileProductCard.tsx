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

interface MobileProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export default function MobileProductCard({
  product,
  onAdd,
}: MobileProductCardProps) {
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
      className="bg-surface-raised rounded-xl flex flex-col shadow-sm border border-subtle active:scale-95 transition-transform duration-100 cursor-pointer overflow-hidden"
    >
      <img
        src={imageUrl}
        alt={product.name}
        className="w-full h-24 object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = templateImg;
        }}
      />
      <div className="p-2 flex flex-col gap-1">
        <p className="text-xs font-bold text-primary line-clamp-2 leading-tight">
          {product.name}
        </p>
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold text-success">
            ${product.price.toFixed(2)}
          </span>
          <button
            className="w-6 h-6 rounded-full bg-success text-white flex items-center justify-center text-sm font-bold hover:bg-success transition shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
