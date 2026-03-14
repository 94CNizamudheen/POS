import menuTemplate from "@assets/dish-placeholder.jpg";

export function getProductImage(media?: string): string | null {
  if (!media || media === "[]") return null;
  try {
    const parsed = JSON.parse(media) as { filepath: string }[];
    return parsed[0]?.filepath ?? null;
  } catch {
    return null;
  }
}

export function CategoryCard({
  name,
  media,
  badge,
  onClick,
}: {
  name: string;
  media?: string;
  badge?: string;
  onClick: () => void;
}) {
  const img = getProductImage(media);
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95 text-left w-full"
      style={{ backgroundColor: "#E5E5DF" }}
    >
      <div className="w-full h-50 overflow-hidden bg-gray-200 flex items-center justify-center">
        <img
          src={img || menuTemplate}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="px-3 py-2">
        <p className="font-extrabold text-gray-900 text-sm">{name}</p>
        {badge && (
          <span
            className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1 text-black"
            style={{ backgroundColor: "#B5E533" }}
          >
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}
