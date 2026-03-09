import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

interface NotificationItemProps {
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  type,
  message,
  duration = 3000,
  onClose
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, duration - 300);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

const styles = {
  success: {
    bg: "bg-notification-success",
    border: "border-notification-success",
    icon: "text-notification-success",
    text: "text-notification-success",
    progress: "bg-notification-success-progress"
  },
  error: {
    bg: "bg-notification-error",
    border: "border-notification-error",
    icon: "text-notification-error",
    text: "text-notification-error",
    progress: "bg-notification-error-progress"
  },
  warning: {
    bg: "bg-notification-warning",
    border: "border-notification-warning",
    icon: "text-notification-warning",
    text: "text-notification-warning",
    progress: "bg-notification-warning-progress"
  },
  info: {
    bg: "bg-notification-info",
    border: "border-notification-info",
    icon: "text-notification-info",
    text: "text-notification-info",
    progress: "bg-notification-info-progress"
  }
}[type];


  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }[type];

  return (
    <div
      className={`
        pointer-events-auto
        min-w-75 -max-w-112.5
        rounded-xl shadow-2xl border 
        overflow-hidden
        transform transition-all duration-300 ease-out
        ${isExiting ? "animate-toast-exit" : "animate-toast-enter"}
        ${styles.bg} ${styles.border}
      `}
    >
      <div className="flex items-start gap-3 p-2">
        {/* Icon */}
        <div className={`shrink-0 mt-0.5 ${styles.icon}`}>
          <Icon size={20} strokeWidth={2} />
        </div>

        {/* Message */}
        <p className={`flex-1 text-sm font-medium leading-relaxed ${styles.text}`}>
          {message}
        </p>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className={`shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.text}`}
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-notification-backdrop">
        <div
          className={`h-full ${styles.progress} animate-progress-shrink`}
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
};

export default NotificationItem;
