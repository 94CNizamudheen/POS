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

export default function CategoryTab() {
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
    <aside className="w-[14%] shrink-0 h-full overflow-y-auto border-r border-gray-100 bg-white pt-2">
      <div className="flex flex-col gap-1.5 p-2">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full rounded-xl text-xs font-medium text-left transition-all border-4 overflow-hidden
                ${
                  isActive
                    ? "border-green-500 shadow-sm"
                    : "border-gray-100 hover:border-green-300"
                }`}
            >
              <img
                src={getCategoryImage(cat.media)}
                alt={cat.name}
                className="w-full h-20 object-cover"
              />
              <div
                className={`px-2 py-1.5 text-center
                ${isActive ? "bg-green-500 text-white" : "bg-gray-50 text-gray-600"}`}
              >
                {cat.name}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
