import { Wifi, WifiOff } from "lucide-react";
import { useKdsWebSocket } from "@/context/kds/KdsWebSocketContext";
import { useKdsSettings } from "@/context/kds/KdsSettingsContext";
import TicketCard from "./TicketCard";

export default function Tickets() {
  const { tickets, isConnected } = useKdsWebSocket();
  const { settings } = useKdsSettings();

  const cols = parseInt(settings.pageGridCols) || 4;

  return (
    <div
      className="flex-1 overflow-auto p-4"
      style={{ backgroundColor: settings.pageBgColor }}
    >
      {!isConnected && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm">
          <WifiOff className="w-4 h-4 shrink-0" />
          Not connected to POS. Go to Settings → POS Connection to connect.
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <p className="text-2xl font-semibold">No Active Orders</p>
          <p className="text-sm mt-2">Orders will appear here when received from POS</p>
          {isConnected && (
            <div className="flex items-center gap-1.5 mt-3 text-green-600 text-xs font-semibold">
              <Wifi className="w-4 h-4" /> Connected to POS
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: settings.pageGap,
          }}
        >
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
