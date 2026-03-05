import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import MenuSelection from "./pages/MenuSelection";
import IncomingOrders from "./pages/IncomingOrders";
import OrdersPage from "./pages/OrdersPage";
import SettingsPage from "./pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <MenuSelection /> },
      { path: "incoming", element: <IncomingOrders /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
