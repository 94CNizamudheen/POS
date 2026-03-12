import { Outlet } from "react-router-dom";
import { OrderProvider } from "@/context/OrderContext";
import { ThemeProvider } from "@/context/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <OrderProvider>
        <div className="safe-area">
          <Outlet />
        </div>
      </OrderProvider>
    </ThemeProvider>
  );
}
