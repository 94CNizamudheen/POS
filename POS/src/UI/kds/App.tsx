import { Outlet } from "react-router-dom";
import { KdsWebSocketProvider } from "@/context/kds/KdsWebSocketContext";
import { KdsSettingsProvider } from "@/context/kds/KdsSettingsContext";

export default function KdsApp() {
  return (
    <KdsWebSocketProvider>
      <KdsSettingsProvider>
        <Outlet />
      </KdsSettingsProvider>
    </KdsWebSocketProvider>
  );
}
