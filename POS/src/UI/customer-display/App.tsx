import { Outlet } from "react-router-dom";
import { CustomerDisplayWebSocketProvider } from "@/context/customer-display/CustomerDisplayWebSocketContext";

export default function CustomerDisplayApp() {
  return (
    <CustomerDisplayWebSocketProvider>
      <Outlet />
    </CustomerDisplayWebSocketProvider>
  );
}
