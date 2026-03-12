import { useMemo } from "react";

/**
 * Detects the runtime platform.
 * - isAndroid: true when running inside an Android WebView that exposes
 *   the BuiltinPrinter JS bridge (custom POS firmware / Tauri Android).
 * - isDesktop: true when running in Tauri desktop (not a mobile WebView).
 */
export function usePlatform() {
  return useMemo(() => {
    const ua = navigator.userAgent.toLowerCase();
    const hasBridge = typeof window !== "undefined" && !!window.BuiltinPrinter;
    const isMobileUA = ua.includes("android") || ua.includes("iphone") || ua.includes("ipad");

    const isAndroid = hasBridge || ua.includes("android");
    const isDesktop = !isMobileUA && !hasBridge;

    return { isAndroid, isDesktop };
  }, []);
}
