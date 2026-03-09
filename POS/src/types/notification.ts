export interface Notification {
  id: number;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}
export interface NotificationContextType {
  showNotification: {
    success: (msg: string, duration?: number) => void;
    error: (msg: string, duration?: number) => void;
    warning: (msg: string, duration?: number) => void;
    info: (msg: string, duration?: number) => void;
  };
}
