import { useNavigate } from "react-router-dom";
import { X, Monitor, ListOrdered, ShoppingCart, ArrowRight } from "lucide-react";

interface Device {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
  accent: string;
  iconBg: string;
}

const DEVICES: Device[] = [
  {
    id: "pos",
    label: "Point of Sale",
    description: "Manage orders and checkout",
    path: "/pos",
    icon: ShoppingCart,
    accent: "text-emerald-600",
    iconBg: "bg-emerald-500/10",
  },
  {
    id: "kds",
    label: "Kitchen Display",
    description: "View and manage kitchen tickets",
    path: "/kds",
    icon: Monitor,
    accent: "text-orange-500",
    iconBg: "bg-orange-500/10",
  },
  {
    id: "queue",
    label: "Queue Display",
    description: "Show order queue to customers",
    path: "/queue",
    icon: ListOrdered,
    accent: "text-blue-500",
    iconBg: "bg-blue-500/10",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Highlight the current device so it looks selected */
  currentDevice?: "pos" | "kds" | "queue";
}

export default function SwitchDeviceModal({ open, onClose, currentDevice = "pos" }: Props) {
  const navigate = useNavigate();

  if (!open) return null;

  function handleSelect(path: string) {
    onClose();
    navigate(path);
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-sm bg-surface-raised rounded-2xl shadow-2xl border border-subtle overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
          <div>
            <h2 className="text-base font-bold text-primary">Switch Device</h2>
            <p className="text-xs text-muted mt-0.5">Select a display to switch to</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-sunken text-muted hover:text-primary hover:bg-subtle transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device list */}
        <div className="p-3 flex flex-col gap-2">
          {DEVICES.map(({ id, label, description, path, icon: Icon, accent, iconBg }) => {
            const isCurrent = currentDevice === id;
            return (
              <button
                key={id}
                onClick={() => !isCurrent && handleSelect(path)}
                disabled={isCurrent}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left
                  ${
                    isCurrent
                      ? "border-success bg-success/5 cursor-default"
                      : "border-subtle bg-surface hover:border-strong hover:bg-surface-sunken active:scale-[0.98]"
                  }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                  <Icon className={`w-5 h-5 ${accent}`} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isCurrent ? "text-success" : "text-primary"}`}>
                    {label}
                  </p>
                  <p className="text-xs text-muted truncate">{description}</p>
                </div>

                {/* State indicator */}
                {isCurrent ? (
                  <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full shrink-0">
                    Current
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4 text-disabled shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
