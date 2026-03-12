import { useProducts } from "@/context/ProductContext";
import ProductCard from "./ProductCard";
import type { Product } from "@/types/product";

interface ProductsProps {
  onAdd: (product: Product) => void;
}

export default function Products({ onAdd }: ProductsProps) {
  const { filteredProducts } = useProducts();

  return (
    <div className="flex-1 overflow-y-auto p-4 ">
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 content-start">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={onAdd} />
          ))}
        </div>
      ) : (
        <p className="text-center py-10 text-muted text-sm">
          No products found
        </p>
      )}
    </div>
  );
}
