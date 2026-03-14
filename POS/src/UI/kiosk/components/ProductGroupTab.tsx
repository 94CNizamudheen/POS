import { useProducts } from "@/context/kiosk/ProductContext";

export default function ProductGroupTab() {
  const { productGroups, selectedGroup, setSelectedGroup } = useProducts();

  if (productGroups.length <= 1) return null;

  return (
    <div className="flex gap-2 px-6 pt-4 pb-2">
      {productGroups.map((group) => (
        <button
          key={group.id}
          onClick={() => setSelectedGroup(group.id)}
          className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            selectedGroup === group.id
              ? "bg-green-500 text-white shadow-md shadow-green-100"
              : "bg-white text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-600"
          }`}
        >
          {group.name}
        </button>
      ))}
    </div>
  );
}
