import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import type {
  CustomerDisplayState,
  CustomerDisplayCartPayload,
  CustomerDisplayOrderCompletePayload,
  PromoMediaItem,
} from "@/types/customer-display";
import { localEventBus, LocalEventTypes } from "@/services/eventbus/LocalEventBus";
import { getCdSettings } from "@/services/customer-display/customerDisplayConnectionConfig";
import CustomerDisplayIdle from "../components/CustomerDisplayIdle";
import CustomerDisplayActive from "../components/CustomerDisplayActive";
import CustomerDisplayOrderComplete from "../components/CustomerDisplayOrderComplete";

export default function CustomerDisplayPage() {
  const navigate = useNavigate();

  const [displayState, setDisplayState] = useState<CustomerDisplayState>({
    status: "idle",
    cart: null,
    orderComplete: null,
    logoUrl: null,
    welcomeMessage: "Welcome!",
  });

  const [promoMedia, setPromoMedia] = useState<PromoMediaItem[]>([]);
  const orderCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load settings from DB on mount
  useEffect(() => {
    getCdSettings().then((settings) => {
      setDisplayState((prev) => ({ ...prev, welcomeMessage: settings.welcomeMessage }));
      setPromoMedia(settings.promoMedia ?? []);
    });
  }, []);

  useEffect(() => {
    const unsub1 = localEventBus.subscribe(
      LocalEventTypes.CUSTOMER_DISPLAY_CART_UPDATE,
      (event) => {
        if (orderCompleteTimerRef.current) {
          clearTimeout(orderCompleteTimerRef.current);
          orderCompleteTimerRef.current = null;
        }
        setDisplayState((prev) => ({
          ...prev,
          status: "active",
          cart: event.payload as CustomerDisplayCartPayload,
          orderComplete: null,
        }));
      },
    );

    const unsub2 = localEventBus.subscribe(
      LocalEventTypes.CUSTOMER_DISPLAY_ORDER_COMPLETE,
      (event) => {
        setDisplayState((prev) => ({
          ...prev,
          status: "order-complete",
          orderComplete: event.payload as CustomerDisplayOrderCompletePayload,
          cart: null,
        }));
        orderCompleteTimerRef.current = setTimeout(() => {
          setDisplayState((prev) => ({ ...prev, status: "idle", orderComplete: null }));
          orderCompleteTimerRef.current = null;
        }, 8000);
      },
    );

    const unsub3 = localEventBus.subscribe(LocalEventTypes.CUSTOMER_DISPLAY_CLEAR, () => {
      setDisplayState((prev) => {
        if (prev.status === "order-complete") return prev;
        if (orderCompleteTimerRef.current) {
          clearTimeout(orderCompleteTimerRef.current);
          orderCompleteTimerRef.current = null;
        }
        return { ...prev, status: "idle", cart: null, orderComplete: null };
      });
    });

    const unsub4 = localEventBus.subscribe(
      LocalEventTypes.CUSTOMER_DISPLAY_BRANDING_UPDATE,
      (event) => {
        const payload = event.payload as {
          promoMedia?: PromoMediaItem[];
          logoUrl?: string;
          welcomeMessage?: string;
        };
        if (payload.promoMedia !== undefined) setPromoMedia(payload.promoMedia);
        if (payload.logoUrl !== undefined || payload.welcomeMessage !== undefined) {
          setDisplayState((prev) => ({
            ...prev,
            ...(payload.logoUrl !== undefined ? { logoUrl: payload.logoUrl ?? null } : {}),
            ...(payload.welcomeMessage !== undefined
              ? { welcomeMessage: payload.welcomeMessage! }
              : {}),
          }));
        }
      },
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      if (orderCompleteTimerRef.current) clearTimeout(orderCompleteTimerRef.current);
    };
  }, []);

  const content = (() => {
    switch (displayState.status) {
      case "active":
        return (
          <CustomerDisplayActive
            cart={displayState.cart!}
            promoMedia={promoMedia}
            logoUrl={displayState.logoUrl}
          />
        );
      case "order-complete":
        return (
          <CustomerDisplayOrderComplete
            data={displayState.orderComplete!}
            logoUrl={displayState.logoUrl}
          />
        );
      default:
        return (
          <CustomerDisplayIdle
            logoUrl={displayState.logoUrl}
            welcomeMessage={displayState.welcomeMessage}
            promoMedia={promoMedia}
          />
        );
    }
  })();

  return (
    <div className="relative">
      {content}
      <button
        onClick={() => navigate("/")}
        className="fixed top-3 right-3 z-50 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white transition-colors"
        title="Exit Customer Display"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
