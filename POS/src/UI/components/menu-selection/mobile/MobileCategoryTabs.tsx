import { useMemo } from "react";
import { useProducts } from "@/context/ProductContext";
import templateImg from "@assets/template.png";

function getCategoryImage(media?: string): string {
  try {
    if (!media) return templateImg;
    const arr = JSON.parse(media);
    return arr?.[0]?.filepath || templateImg;
  } catch {
    return templateImg;
  }
}

export default function MobileCategoryTabs() {
  const {
    groupCategories,
    selectedGroup,
    selectedCategory,
    setSelectedCategory,
  } = useProducts();

  const categories = useMemo(
    () =>
      groupCategories
        .filter((c) => c.product_group_id === selectedGroup && c.active === 1)
        .sort((a, b) => a.sort_order - b.sort_order),
    [groupCategories, selectedGroup],
  );

  if (!categories.length) return null;

  return (
    <div className="w-full overflow-x-auto no-scrollbar px-3 py-2">
      <div className="flex gap-2 min-w-max">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="flex flex-col items-center gap-1 shrink-0 transition-all"
            >
              <div
                className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                  isActive
                    ? "border-success shadow-md"
                    : "border-default"
                }`}
              >
                <img
                  src={getCategoryImage(cat.media)}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className={`text-[10px] font-semibold max-w-15 truncate ${
                  isActive ? "text-success" : "text-muted"
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
