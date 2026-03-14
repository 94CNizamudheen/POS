import { useProducts } from "@/context/kiosk/ProductContext";

export default function CategoryTab() {
  const {
    groupCategories,
    selectedGroup,
    selectedCategory,
    setSelectedCategory,
  } = useProducts();

  const categories = groupCategories.filter(
    (c) => c.product_group_id === selectedGroup,
  );

  if (!categories.length) return null;

  return (
    <div className="flex gap-3 px-6 pb-4 overflow-x-auto scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => setSelectedCategory(cat.id)}
          className={`shrink-0 px-5 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
            selectedCategory === cat.id
              ? "bg-green-500 text-white shadow-md shadow-green-100"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
