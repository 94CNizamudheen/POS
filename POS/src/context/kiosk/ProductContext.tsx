import { createContext, useContext, useMemo, useState } from "react";
import type {
  Product,
  ProductGroup,
  ProductGroupCategory,
} from "@/types/product";
import { mockCombinations } from "@data/mockCombinations";

// ─── Flatten mock data ────────────────────────────────────────────────────────

const productGroups: ProductGroup[] = mockCombinations.map(
  ({ categories: _c, ...g }) => g,
);

const groupCategories: ProductGroupCategory[] = mockCombinations.flatMap((g) =>
  g.categories.map(({ products: _p, ...c }) => c),
);

const allProducts: Product[] = mockCombinations.flatMap((g) =>
  g.categories.flatMap((c) => c.products),
);

// ─── Context ──────────────────────────────────────────────────────────────────

interface ProductContextValue {
  productGroups: ProductGroup[];
  groupCategories: ProductGroupCategory[];
  selectedGroup: string;
  setSelectedGroup: (id: string) => void;
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
  filteredProducts: Product[];
}

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [selectedGroup, setSelectedGroupState] = useState(
    productGroups[0]?.id ?? "",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    groupCategories.find((c) => c.product_group_id === productGroups[0]?.id)
      ?.id ?? "",
  );

  function setSelectedGroup(id: string) {
    setSelectedGroupState(id);
    const firstCat = groupCategories.find((c) => c.product_group_id === id);
    setSelectedCategory(firstCat?.id ?? "");
  }

  const filteredProducts = useMemo(() => {
    return allProducts.filter(
      (p) => p.category_id === selectedCategory && p.active && !p.is_sold_out,
    );
  }, [selectedCategory]);

  return (
    <ProductContext.Provider
      value={{
        productGroups,
        groupCategories,
        selectedGroup,
        setSelectedGroup,
        selectedCategory,
        setSelectedCategory,
        filteredProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error("useProducts must be used within ProductProvider");
  return ctx;
}
