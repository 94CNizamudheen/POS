import { useNavigate } from "react-router-dom";
import { Settings, LogOut, UtensilsCrossed, Wifi, WifiOff } from "lucide-react";
import { useKdsWebSocket } from "@/context/kds/KdsWebSocketContext";
import { useKdsGroup } from "@/context/kds/KdsGroupContext";
import logoPng from "@/assets/Dine-in.png";

export default function KDSTicketHeader() {
  const navigate = useNavigate();
  const { isConnected, tickets } = useKdsWebSocket();
  const { groups, selectedGroupId, setSelectedGroupId } = useKdsGroup();

  return (
    <header className="bg-gray-900 text-white px-4 py-3 flex items-center gap-3 shrink-0 border-b border-gray-700">
      {/* Logo + title */}
      <div className="flex items-center gap-2 shrink-0">
        <img src={logoPng} alt="Logo" className="w-8 h-8 object-contain" />
        <div>
          <p className="text-sm font-bold leading-none">Kitchen Display</p>
          <p className="text-xs text-gray-400 leading-none mt-0.5">KDS Station</p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-600 shrink-0" />

      {/* Group switcher */}
      {groups.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSelectedGroupId(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGroupId === null
                ? "bg-orange-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            All
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedGroupId === g.id
                  ? "bg-orange-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Ticket count */}
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <UtensilsCrossed className="w-4 h-4 text-orange-400" />
        <span className="text-orange-400">{tickets.length}</span>
        <span className="text-gray-400 text-xs">orders</span>
      </div>

      {/* Connection status */}
      {isConnected ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-900/40 px-2 py-1 rounded-full">
          <Wifi className="w-3 h-3" /> Live
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-900/40 px-2 py-1 rounded-full">
          <WifiOff className="w-3 h-3" /> Offline
        </span>
      )}

      {/* Settings */}
      <button
        onClick={() => navigate("/kds/settings")}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
        title="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Exit */}
      <button
        onClick={() => navigate("/")}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-red-800 transition-colors text-red-400"
        title="Exit to Role Selection"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  );
}
