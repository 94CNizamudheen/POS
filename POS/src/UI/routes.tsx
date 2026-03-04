import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import MenuSelection from "./pages/MenuSelection";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <MenuSelection />,
      },
    ],
  },
]);
