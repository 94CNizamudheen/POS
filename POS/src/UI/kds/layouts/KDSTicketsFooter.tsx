import { useNavigate, useLocation } from "react-router-dom";
import { UtensilsCrossed, CheckCircle2 } from "lucide-react";
import { useKdsWebSocket } from "@/context/kds/KdsWebSocketContext";

const NAV = [
  { path: "/kds", label: "Active", icon: UtensilsCrossed },
  { path: "/kds/completed", label: "Completed", icon: CheckCircle2 },
];

export default function KDSTicketsFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tickets, completedTickets } = useKdsWebSocket();

  const counts: Record<string, number> = {
    "/kds": tickets.length,
    "/kds/completed": completedTickets.length,
  };

  return (
    <footer className="bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center gap-2 shrink-0">
      {NAV.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path;
        const count = counts[path] ?? 0;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              active
                ? "bg-orange-500 text-white"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  active ? "bg-white text-orange-500" : "bg-gray-600 text-white"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </footer>
  );
}
