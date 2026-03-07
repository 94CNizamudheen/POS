import { Outlet } from "react-router-dom";
import MenuSelectionSidebar from "../components/menu-selection/MenuSelectionSidebar";

export default function SidebarLayout() {
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <MenuSelectionSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
