import { useProducts } from "@/context/ProductContext";

export default function ProductGroupTab() {
  const { productGroups, selectedGroup, setSelectedGroup } = useProducts();

  if (productGroups.length <= 1) return null;

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="flex gap-2 min-w-max">
        {productGroups.map((group) => (
          <button
            key={group.id}
            onClick={() => setSelectedGroup(group.id)}
            className={`px-15 py-4 rounded-lg border text-sm whitespace-nowrap transition-all
              ${
                selectedGroup === group.id
                  ? "bg-green-500 text-white border-green-500 shadow-sm"
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
