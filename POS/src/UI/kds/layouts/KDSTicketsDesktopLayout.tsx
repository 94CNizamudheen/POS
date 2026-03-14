import { Outlet } from "react-router-dom";
import KDSTicketHeader from "./KDSTicketHeader";
import KDSTicketsFooter from "./KDSTicketsFooter";
import { KdsGroupProvider } from "@/context/kds/KdsGroupContext";

export default function KDSTicketsDesktopLayout() {
  return (
    <KdsGroupProvider>
      <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
        <KDSTicketHeader />
        <main className="flex-1 overflow-hidden flex flex-col">
          <Outlet />
        </main>
        <KDSTicketsFooter />
      </div>
    </KdsGroupProvider>
  );
}
