import { createContext, useContext, useMemo, useState } from "react";
import { mockCombinations } from "../../data/mockCombinations";
import type {
  Product,
  ProductGroup,
  ProductGroupCategory,
} from "@/types/product";

interface ProductContextValue {
  productGroups: ProductGroup[];
  groupCategories: ProductGroupCategory[];
  selectedGroup: string;
  setSelectedGroup: (id: string) => void;
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
  filteredProducts: Product[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const productGroups = useMemo(
    () => mockCombinations.map(({ categories: _, ...g }) => g),
    [],
  );

  const groupCategories = useMemo(
    () =>
      mockCombinations.flatMap((g) =>
        g.categories.map(({ products: _, ...c }) => c),
      ),
    [],
  );

  const [selectedGroup, setSelectedGroup] = useState<string>(
    productGroups[0]?.id ?? "",
  );

  const firstCategoryId = useMemo(
    () =>
      groupCategories.find((c) => c.product_group_id === selectedGroup)?.id ??
      "",
    [groupCategories, selectedGroup],
  );

  const [selectedCategory, setSelectedCategory] =
    useState<string>(firstCategoryId);

  const [searchQuery, setSearchQuery] = useState<string>("");

  // When group changes, reset to first category of that group
  const handleSetSelectedGroup = (id: string) => {
    setSelectedGroup(id);
    const first = groupCategories.find((c) => c.product_group_id === id);
    setSelectedCategory(first?.id ?? "");
  };

  const filteredProducts = useMemo<Product[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return mockCombinations
        .flatMap((g) => g.categories.flatMap((c) => c.products))
        .filter((p) => p.name.toLowerCase().includes(q));
    }
    const group = mockCombinations.find((g) => g.id === selectedGroup);
    const category = group?.categories.find((c) => c.id === selectedCategory);
    return category?.products ?? [];
  }, [selectedGroup, selectedCategory, searchQuery]);

  return (
    <ProductContext.Provider
      value={{
        productGroups,
        groupCategories,
        selectedGroup,
        setSelectedGroup: handleSetSelectedGroup,
        selectedCategory,
        setSelectedCategory,
        filteredProducts,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error("useProducts must be used inside ProductProvider");
  return ctx;
}
