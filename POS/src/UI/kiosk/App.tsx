import { Outlet } from "react-router-dom";
import { OrderProvider } from "@/context/kiosk/OrderContext";
import { AppProvider } from "@/context/kiosk/AppContext";

export default function KioskApp() {
  return (
    <AppProvider>
      <OrderProvider>
        <Outlet />
      </OrderProvider>
    </AppProvider>
  );
}
