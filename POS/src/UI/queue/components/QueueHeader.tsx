import { useNavigate } from "react-router-dom";
import { Wifi, WifiOff, Settings } from "lucide-react";
import { useQueueWebSocket } from "@/context/queue/QueueWebSocketContext";

export default function QueueHeader() {
  const navigate = useNavigate();
  const { isConnected, isConnecting } = useQueueWebSocket();

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700">
      <div className="flex items-center gap-3">
        <span className="text-white font-bold text-xl tracking-wide">Queue Display</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Connection status */}
        <button
          onClick={() => navigate("/queue/settings")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isConnected
              ? "bg-green-800/40 text-green-300"
              : isConnecting
                ? "bg-yellow-800/40 text-yellow-300"
                : "bg-red-800/40 text-red-300 animate-pulse"
          }`}
        >
          {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>{isConnected ? "Live" : isConnecting ? "Connecting…" : "Offline"}</span>
        </button>

        <button
          onClick={() => navigate("/queue/settings")}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="Settings"
        >
          <Settings size={18} />
        </button>

        <button
          onClick={() => navigate("/")}
          className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          Exit
        </button>
      </div>
    </div>
  );
}
