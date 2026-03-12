import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { useOrder } from "@/context/OrderContext";
import { appLocalService } from "@/services/local/app.local.service";
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
    appLocalService.getPairedKioskId()
      .then((v) => setIsSamePosition(v !== null))
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
    onRecall(enrichLineItems(order.items));
    releaseOrder(order.orderId);
    clearKioskSentOrder();
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80 rounded-2xl bg-surface-raised shadow-2xl border border-subtle overflow-hidden">
      {/* Countdown progress bar */}
      <div
        className="h-1 bg-success transition-all duration-1000 ease-linear"
        style={{ width: `${(countdown / 5) * 100}%` }}
      />

      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success-subtle flex items-center justify-center">
              <Send className="w-4 h-4 text-success" />
            </div>
            <span className="font-bold text-sm text-primary">Sent to Kiosk</span>
          </div>
          <span className="text-xs text-muted font-semibold tabular-nums">
            {countdown}s
          </span>
        </div>

        {/* Order number */}
        <div className="rounded-xl bg-warning-subtle border-2 border-warning px-4 py-3 flex flex-col items-center gap-0.5">
          <p className="text-[10px] font-bold text-warning uppercase tracking-widest">
            Give this number to the customer
          </p>
          <p className="text-4xl font-black tracking-widest text-warning">
            #{order.orderNumber}
          </p>
          <p className="text-[10px] text-warning text-center leading-tight mt-0.5">
            Customer enters this at the kiosk to continue
          </p>
        </div>

        {/* Cancel / recall */}
        <button
          onClick={handleCancel}
          className="w-full py-2 rounded-xl border-2 border-danger text-danger font-bold text-xs hover:bg-danger-subtle hover:border-danger transition-all flex items-center justify-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          Cancel &amp; Recall Order
        </button>
      </div>
    </div>
  );
}
