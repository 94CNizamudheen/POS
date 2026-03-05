import { Outlet } from "react-router-dom";
import { OrderProvider } from "@/context/OrderContext";

export default function App() {
  return (
    <OrderProvider>
      <Outlet />
    </OrderProvider>
  );
}
