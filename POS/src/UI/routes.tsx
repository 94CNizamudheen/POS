import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import MenuSelectionLayout from "./layouts/MenuSelectionLayout";
import MenuSelection from "./pages/MenuSelection";
import IncomingOrders from "./pages/IncomingOrders";
import OrdersPage from "./pages/OrdersPage";
import SettingsPage from "./pages/SettingsPage";
import HeldOrdersPage from "./pages/HeldOrdersPage";
import ConnectionSettingsPage from "./pages/settings/ConnectionSettingsPage";
import PrinterSettingsPage from "./pages/settings/PrinterSettingsPage";
import PaymentPage from "./pages/PaymentPage";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import PosLoginPage from "./pages/PosLoginPage";
import KioskApp from "./kiosk/App";
import Welcome from "./kiosk/pages/Welcome";
import OrderType from "./kiosk/pages/OrderType";
import Menu from "./kiosk/pages/Menu";
import Payment from "./kiosk/pages/Payment";
import OrderConfirmed from "./kiosk/pages/OrderConfirmed";
import KioskSettings from "./kiosk/pages/KioskSettings";
import KdsApp from "./kds/App";
import KDSTicketsLayout from "./kds/layouts/KDSTicketsLayout";
import Tickets from "./kds/tickets/Tickets";
import CompletedTickets from "./kds/tickets/CompletedTickets";
import KdsSettingsHub from "./kds/settings/KdsSettingsHub";
import KdsSettingsPage from "./kds/settings/KdsSettingsPage";
import KdsDepartmentsPage from "./kds/settings/KdsDepartmentsPage";
import KdsConnectionPage from "./kds/settings/KdsConnectionPage";
import QueueApp from "./queue/App";
import QueueDisplay from "./queue/pages/QueueDisplay";
import QueueConnectionPage from "./queue/pages/QueueConnectionPage";
import CustomerDisplayApp from "./customer-display/App";
import CustomerDisplayPage from "./customer-display/pages/CustomerDisplayPage";
import CustomerDisplayConnectionPage from "./customer-display/pages/CustomerDisplayConnectionPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RoleSelectionPage />,
  },
  {
    path: "/pos-login",
    element: <PosLoginPage />,
  },
  {
    path: "/pos",
    element: <App />,
    children: [
      {
        element: <MenuSelectionLayout />,
        children: [
          { index: true, element: <MenuSelection /> },
          { path: "incoming", element: <IncomingOrders /> },
          { path: "orders", element: <OrdersPage /> },
          { path: "held-orders", element: <HeldOrdersPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "settings/connection", element: <ConnectionSettingsPage /> },
          { path: "settings/printers", element: <PrinterSettingsPage /> },
          { path: "payment", element: <PaymentPage /> },
        ],
      },
    ],
  },
  {
    path: "/kiosk",
    element: <KioskApp />,
    children: [
      { index: true, element: <Welcome /> },
      { path: "order-type", element: <OrderType /> },
      { path: "menu", element: <Menu /> },
      { path: "resume/:orderNumber", element: <Menu /> },
      { path: "payment", element: <Payment /> },
      { path: "confirmed", element: <OrderConfirmed /> },
      { path: "settings", element: <KioskSettings /> },
    ],
  },
  {
    path: "/kds",
    element: <KdsApp />,
    children: [
      {
        element: <KDSTicketsLayout />,
        children: [
          { index: true, element: <Tickets /> },
          { path: "completed", element: <CompletedTickets /> },
        ],
      },
      { path: "settings", element: <KdsSettingsHub /> },
      { path: "settings/style", element: <KdsSettingsPage /> },
      { path: "settings/departments", element: <KdsDepartmentsPage /> },
      { path: "settings/connection", element: <KdsConnectionPage /> },
    ],
  },
  {
    path: "/queue",
    element: <QueueApp />,
    children: [
      { index: true, element: <QueueDisplay /> },
      { path: "settings", element: <QueueConnectionPage /> },
    ],
  },
  {
    path: "/customer-display",
    element: <CustomerDisplayApp />,
    children: [
      { index: true, element: <CustomerDisplayPage /> },
      { path: "settings", element: <CustomerDisplayConnectionPage /> },
    ],
  },
]);
