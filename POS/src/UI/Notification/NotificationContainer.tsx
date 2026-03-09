import { type Notification } from "@/types/notification";
import NotificationItem from "./Notification";

interface NotificationContainerProps {
  notifications: Notification[];
  onRemove: (id: number) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove,
}) => {
  return (
    <div className="fixed top-1  left-0 right-0 z-10000 flex flex-col items-center gap-3 pointer-events-none safe-area-header">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          type={notification.type}
          message={notification.message}
          duration={notification.duration}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
