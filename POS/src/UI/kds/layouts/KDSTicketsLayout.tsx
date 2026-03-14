import { useState, useEffect } from "react";
import KDSTicketsDesktopLayout from "./KDSTicketsDesktopLayout";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export default function KDSTicketsLayout() {
  useIsDesktop();
  return <KDSTicketsDesktopLayout />;
}
