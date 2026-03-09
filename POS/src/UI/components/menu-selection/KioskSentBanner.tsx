import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useOrder } from "@/context/OrderContext";
import type { CartItem } from "@/UI/components/menu-selection/CartSidebar";
import { enrichLineItems } from "@/utils/enrichLineItems";

interface KioskSentBannerProps {
  onRecall: (items: CartItem[]) => void;
}

export default function KioskSentBanner({ onRecall }: KioskSentBannerProps) {
  const { kioskSentOrder, clearKioskSentOrder, releaseOrder } = useOrder();
  const [countdown, setCountdown] = useState(5);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSamePosition, setIsSamePosition] = useState(false);

  useEffect(() => {
    invoke<string | null>("get_app_state", { key: "paired_kiosk_id" })
      .then((v) => setIsSamePosition(!!v && v.length > 0))
      .catch(() => {});
  }, []);

  // Reset & start countdown each time a new order is sent
  useEffect(() => {
    if (!kioskSentOrder) return;
    setCountdown(5);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          clearKioskSentOrder();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kioskSentOrder?.orderId]);

  // SAME position: kiosk auto-navigates to the menu — no need for the banner
  if (!kioskSentOrder || isSamePosition) return null;

  const order = kioskSentOrder;

  function handleCancel() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Restore items to POS cart before recalling (with media/images enriched from catalog)
    onRecall(enrichLineItems(order.items));
    // Recall the order from server — KIOSK receives ORDER_CANCELLED and deletes from its DB
    releaseOrder(order.orderId);
    clearKioskSentOrder();
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80 rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
      {/* Countdown progress bar */}
      <div
        className="h-1 bg-green-400 transition-all duration-1000 ease-linear"
        style={{ width: `${(countdown / 5) * 100}%` }}
      />

      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Send className="w-4 h-4 text-green-600" />
            </div>
            <span className="font-bold text-sm text-gray-800">Sent to Kiosk</span>
          </div>
          <span className="text-xs text-gray-400 font-semibold tabular-nums">
            {countdown}s
          </span>
        </div>

        {/* Order number — the key info for the cashier */}
        <div className="rounded-xl bg-amber-50 border-2 border-amber-300 px-4 py-3 flex flex-col items-center gap-0.5">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
            Give this number to the customer
          </p>
          <p className="text-4xl font-black tracking-widest text-amber-700">
            #{order.orderNumber}
          </p>
          <p className="text-[10px] text-amber-500 text-center leading-tight mt-0.5">
            Customer enters this at the kiosk to continue
          </p>
        </div>

        {/* Cancel / recall */}
        <button
          onClick={handleCancel}
          className="w-full py-2 rounded-xl border-2 border-red-200 text-red-500 font-bold text-xs hover:bg-red-50 hover:border-red-400 transition-all flex items-center justify-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          Cancel &amp; Recall Order
        </button>
      </div>
    </div>
  );
}
