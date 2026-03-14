import { invoke } from "@tauri-apps/api/core";
import type {
  CustomerDisplayCartPayload,
  CustomerDisplayOrderCompletePayload,
  PromoMediaItem,
} from "@/types/customer-display";
import { CUSTOMER_DISPLAY_EVENTS } from "@/types/customer-display";

class CustomerDisplayEmitter {
  private enabled = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /** Broadcast cart update to all connected Customer Display terminals */
  async emitCartUpdate(payload: CustomerDisplayCartPayload): Promise<void> {
    if (!this.enabled) return;
    try {
      await invoke("broadcast_to_customer_display", {
        message: { type: CUSTOMER_DISPLAY_EVENTS.CART_UPDATE, payload },
      });
    } catch {
      // Customer display is optional — silent failure
    }
  }

  /** Broadcast order complete to all connected Customer Display terminals */
  async emitOrderComplete(payload: CustomerDisplayOrderCompletePayload): Promise<void> {
    if (!this.enabled) return;
    try {
      await invoke("broadcast_to_customer_display", {
        message: { type: CUSTOMER_DISPLAY_EVENTS.ORDER_COMPLETE, payload },
      });
    } catch {}
  }

  /** Broadcast branding update (promo media, logo, welcome message) */
  async emitBrandingUpdate(options: {
    promoMedia?: PromoMediaItem[];
    logoUrl?: string;
    welcomeMessage?: string;
  }): Promise<void> {
    if (!this.enabled) return;
    try {
      await invoke("broadcast_to_customer_display", {
        message: { type: CUSTOMER_DISPLAY_EVENTS.BRANDING_UPDATE, payload: options },
      });
    } catch {}
  }

  /** Broadcast clear (return to idle) */
  async emitClear(): Promise<void> {
    if (!this.enabled) return;
    try {
      await invoke("broadcast_to_customer_display", {
        message: { type: CUSTOMER_DISPLAY_EVENTS.CLEAR, payload: {} },
      });
    } catch {}
  }
}

export const customerDisplayEmitter = new CustomerDisplayEmitter();
