import { useState, useEffect, useRef } from "react";
import { Check } from "lucide-react";
import type { KDSTicket } from "@/types/kds";
import { useKdsSettings } from "@/context/kds/KdsSettingsContext";
import { useKdsWebSocket } from "@/context/kds/KdsWebSocketContext";

interface TicketCardProps {
  ticket: KDSTicket;
}

function getElapsedColor(receivedTime: string, settings: any): string {
  const elapsed = (Date.now() - new Date(receivedTime).getTime()) / 1000 / 60;
  if (elapsed < 5) return settings.elapsedColor0to5;
  if (elapsed < 10) return settings.elapsedColor5to10;
  if (elapsed < 15) return settings.elapsedColor10to15;
  return settings.elapsedColor15plus;
}

function formatElapsed(receivedTime: string): string {
  const elapsed = Math.floor((Date.now() - new Date(receivedTime).getTime()) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const { settings } = useKdsSettings();
  const { toggleItem, markTicketDone } = useKdsWebSocket();
  const [elapsed, setElapsed] = useState(() => formatElapsed(ticket.receivedTime));
  const [elapsedColor, setElapsedColor] = useState(() =>
    getElapsedColor(ticket.receivedTime, settings),
  );
  const autoMarkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatElapsed(ticket.receivedTime));
      setElapsedColor(getElapsedColor(ticket.receivedTime, settings));
    }, 1000);
    return () => clearInterval(interval);
  }, [ticket.receivedTime, settings]);

  const allToggled = ticket.items.length > 0 && ticket.items.every((item) => item.toggled);

  useEffect(() => {
    if (allToggled && settings.autoMarkDone) {
      autoMarkRef.current = setTimeout(() => {
        markTicketDone(ticket.id);
      }, 2000);
    }
    return () => {
      if (autoMarkRef.current) clearTimeout(autoMarkRef.current);
    };
  }, [allToggled, settings.autoMarkDone, ticket.id]);

  const receivedTimeStr = new Date(ticket.receivedTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div
      className="overflow-hidden flex flex-col"
      style={{
        backgroundColor: settings.cardBgColor,
        borderRadius: settings.cardBorderRadius,
        boxShadow: settings.cardShadow,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-start justify-between"
        style={{ backgroundColor: elapsedColor, color: settings.headerTextColor }}
      >
        <div>
          <h3
            style={{
              fontSize: settings.headerFontSize,
              fontWeight: settings.headerFontWeight,
            }}
          >
            #{ticket.orderNumber}
          </h3>
          <p className="text-sm opacity-90">{ticket.orderMode}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{receivedTimeStr}</p>
          <p className="text-sm font-bold">{elapsed}</p>
        </div>
      </div>

      {/* Body */}
      <div
        className="p-4 flex-1 flex flex-col gap-2"
        style={{
          backgroundColor: allToggled ? settings.completedCardBg : settings.bodyBgColor,
          color: allToggled ? settings.completedTextColor : settings.bodyTextColor,
        }}
      >
        {settings.showAdminId && ticket.adminId && (
          <p className="text-xs font-medium opacity-70">ID: {ticket.adminId}</p>
        )}

        {ticket.items.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleItem(ticket.id, item.id)}
            className="cursor-pointer hover:opacity-90 transition-all border-2 select-none"
            style={{
              backgroundColor: item.toggled ? settings.itemCompletedBg : settings.itemPendingBg,
              borderColor: item.toggled ? settings.itemCompletedBorder : settings.itemPendingBorder,
              color: item.toggled ? settings.itemCompletedText : settings.itemPendingText,
              borderRadius: settings.itemBorderRadius,
              padding: settings.itemPadding,
            }}
          >
            <div className="flex items-start gap-2">
              {item.toggled && (
                <div className="bg-white rounded-full p-0.5 mt-0.5 shrink-0">
                  <Check size={14} style={{ color: settings.itemCompletedBg }} />
                </div>
              )}
              <div className="flex-1">
                <p
                  style={{
                    fontSize: settings.itemFontSize,
                    fontWeight: settings.itemFontWeight,
                  }}
                >
                  {item.quantity}x {item.name}
                </p>
                {item.notes && (
                  <p className="text-xs opacity-90 font-semibold mt-0.5">
                    (Notes: {item.notes})
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => markTicketDone(ticket.id)}
          className="w-full mt-2 font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: settings.buttonBgColor,
            color: settings.buttonTextColor,
            borderRadius: settings.buttonBorderRadius,
            fontSize: settings.buttonFontSize,
            fontWeight: settings.buttonFontWeight,
            padding: `${settings.buttonPadding} 0`,
          }}
        >
          Mark as Done ✓
        </button>
      </div>
    </div>
  );
}
