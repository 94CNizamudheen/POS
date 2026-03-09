import { createContext, type ReactNode, useContext, useState } from "react";
import type {
  Notification,
  NotificationContextType,
} from "@/types/notification";
import NotificationContainer from "@/UI/Notification/NotificationContainer";

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const push = (
    message: string,
    type: Notification["type"],
    duration = 3000,
  ) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
  };

  const showNotification = {
    success: (msg: string, duration?: number) => push(msg, "success", duration),
    error: (msg: string, duration?: number) => push(msg, "error", duration),
    warning: (msg: string, duration?: number) => push(msg, "warning", duration),
    info: (msg: string, duration?: number) => push(msg, "info", duration),
  };

  const removeNotification = (id: number): void => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
};
