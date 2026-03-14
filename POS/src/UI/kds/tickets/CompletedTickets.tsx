import { CheckCircle2 } from "lucide-react";
import { useKdsWebSocket } from "@/context/kds/KdsWebSocketContext";
import { useKdsSettings } from "@/context/kds/KdsSettingsContext";

export default function CompletedTickets() {
  const { completedTickets } = useKdsWebSocket();
  const { settings } = useKdsSettings();

  const cols = parseInt(settings.pageGridCols) || 4;

  return (
    <div
      className="flex-1 overflow-auto p-4"
      style={{ backgroundColor: settings.pageBgColor }}
    >
      {completedTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <CheckCircle2 className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-xl font-semibold">No Completed Orders</p>
          <p className="text-sm mt-1">Completed orders will appear here</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: settings.pageGap,
          }}
        >
          {completedTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="overflow-hidden opacity-70"
              style={{
                backgroundColor: settings.completedCardBg,
                borderRadius: settings.cardBorderRadius,
                boxShadow: settings.cardShadow,
              }}
            >
              <div
                className="px-4 py-3"
                style={{
                  backgroundColor: settings.elapsedColor0to5,
                  color: settings.headerTextColor,
                }}
              >
                <h3
                  style={{
                    fontSize: settings.headerFontSize,
                    fontWeight: settings.headerFontWeight,
                  }}
                >
                  #{ticket.orderNumber}
                </h3>
                <p className="text-sm opacity-80">{ticket.orderMode}</p>
              </div>
              <div className="p-4" style={{ color: settings.completedTextColor }}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Completed</span>
                </div>
                {ticket.items.map((item) => (
                  <p key={item.id} className="text-sm opacity-80 line-through">
                    {item.quantity}x {item.name}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
