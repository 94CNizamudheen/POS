import { type ComponentType, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { ProductProvider } from "@/context/ProductContext";
import { AnimationProvider } from "@/context/AnimationContext";
import MenuSelectionSidebar from "../components/menu-selection/MenuSelectionSidebar";
import MobileView from "../components/menu-selection/mobile/MobileView";

// Desktop shell: sidebar + content area
function WebView({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <MenuSelectionSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/orders": "Orders",
  "/incoming": "Incoming Orders",
  "/settings/printers": "Printer Settings",
  "/settings/connection": "Connection & Terminals",
  "/settings": "Settings",
  "/held-orders": "Held Orders",
};

const FULL_SCREEN_PATHS = Object.keys(PAGE_TITLES);

export default function MenuSelectionLayout() {
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const navigate = useNavigate();

  const Desktop = WebView as ComponentType<{ children?: ReactNode }>;
  const Mobile = MobileView as ComponentType<{ children?: ReactNode }>;

  const isFullScreenPage = FULL_SCREEN_PATHS.some((p) =>
    location.pathname.startsWith(p),
  );

  const pageTitle =
    Object.entries(PAGE_TITLES).find(([p]) =>
      location.pathname.startsWith(p),
    )?.[1] ?? "";

  // On mobile, secondary pages get a simple back-nav header
  if (!isDesktop && isFullScreenPage) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 font-sans">
        <header className="h-14 bg-white border-b border-gray-100 shadow-sm flex items-center gap-3 px-4 shrink-0 z-10">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-bold text-gray-800">{pageTitle}</span>
        </header>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <ProductProvider>
      <AnimationProvider>
        <div className="w-full h-full">
          {isDesktop ? (
            <Desktop>
              <Outlet />
            </Desktop>
          ) : (
            <Mobile />
          )}
        </div>
      </AnimationProvider>
    </ProductProvider>
  );
}
