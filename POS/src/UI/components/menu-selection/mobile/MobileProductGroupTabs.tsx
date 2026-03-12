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
                ? "bg-success text-white border-success shadow-sm"
                : "bg-surface-raised text-secondary border-default hover:border-success"
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>
    </div>
  );
}
