import { Outlet } from "react-router-dom";
import { QueueWebSocketProvider } from "@/context/queue/QueueWebSocketContext";

export default function QueueApp() {
  return (
    <QueueWebSocketProvider>
      <Outlet />
    </QueueWebSocketProvider>
  );
}
