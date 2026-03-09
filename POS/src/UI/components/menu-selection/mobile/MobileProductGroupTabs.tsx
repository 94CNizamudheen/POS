import { useProducts } from "@/context/ProductContext";

export default function MobileProductGroupTabs() {
  const { productGroups, selectedGroup, setSelectedGroup } = useProducts();

  if (productGroups.length <= 1) return null;

  return (
    <div className="w-full overflow-x-auto no-scrollbar px-3 py-2">
      <div className="flex gap-2 min-w-max">
        {productGroups.map((group) => (
          <button
            key={group.id}
            onClick={() => setSelectedGroup(group.id)}
            className={`px-4 py-3 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
              selectedGroup === group.id
                ? "bg-green-500 text-white border-green-500 shadow-sm shadow-green-200"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>
    </div>
  );
}
