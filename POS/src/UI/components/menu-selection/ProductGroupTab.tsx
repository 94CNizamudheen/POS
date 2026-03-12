import { useProducts } from "@/context/ProductContext";

export default function ProductGroupTab() {
  const { productGroups, selectedGroup, setSelectedGroup } = useProducts();

  if (productGroups.length <= 1) return null;

  return (
    <div className="w-full overflow-x-auto no-scrollbar ">
      <div className="flex gap-2 min-w-max ">
        {productGroups.map((group) => (
          <button
            key={group.id}
            onClick={() => setSelectedGroup(group.id)}
            className={`px-15 py-4 rounded-lg border-4 text-sm whitespace-nowrap transition-all
              ${
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
