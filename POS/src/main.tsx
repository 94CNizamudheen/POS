import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./UI/routes";
import "./index.css";
import { NotificationProvider } from "./context/NotificationContext";

ReactDOM.createRoot(document.getElementById("app")!).render(
  <NotificationProvider>
    <RouterProvider router={router} />
  </NotificationProvider>,
);
