import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import MenuSelectionLayout from "./layouts/MenuSelectionLayout";
import MenuSelection from "./pages/MenuSelection";
import IncomingOrders from "./pages/IncomingOrders";
import OrdersPage from "./pages/OrdersPage";
import SettingsPage from "./pages/SettingsPage";
import HeldOrdersPage from "./pages/HeldOrdersPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        element: <MenuSelectionLayout />,
        children: [
          { index: true, element: <MenuSelection /> },
          { path: "incoming", element: <IncomingOrders /> },
          { path: "orders", element: <OrdersPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "held-orders", element: <HeldOrdersPage /> },
        ],
      },
    ],
  },
]);
