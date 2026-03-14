import { useNavigate } from "react-router-dom";
import { Monitor, ChefHat, Tv, Users, Smartphone } from "lucide-react";

type Role = {
  key: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  available: boolean;
};

const ROLES: Role[] = [
  {
    key: "POS",
    label: "Point of Sale",
    description: "Cashier workstation for taking orders and processing payments",
    icon: Monitor,
    color: "#3b82f6",
    available: true,
  },
  {
    key: "KIOSK",
    label: "Kiosk",
    description: "Self-service ordering terminal for customers",
    icon: Smartphone,
    color: "#8b5cf6",
    available: true,
  },
  {
    key: "KDS",
    label: "Kitchen Display",
    description: "Kitchen order display for food preparation",
    icon: ChefHat,
    color: "#f59e0b",
    available: true,
  },
  {
    key: "QUEUE",
    label: "Queue Display",
    description: "Customer-facing order status and queue screen",
    icon: Users,
    color: "#10b981",
    available: true,
  },
  {
    key: "CUSTOMER_DISPLAY",
    label: "Customer Display",
    description: "Secondary screen showing order summary to customer",
    icon: Tv,
    color: "#06b6d4",
    available: true,
  },
];

export default function RoleSelectionPage() {
  const navigate = useNavigate();

  function handleSelect(role: Role) {
    if (!role.available) return;
    if (role.key === "POS") navigate("/pos-login");
    if (role.key === "KIOSK") navigate("/kiosk");
    if (role.key === "KDS") navigate("/kds");
    if (role.key === "QUEUE") navigate("/queue");
    if (role.key === "CUSTOMER_DISPLAY") navigate("/customer-display");
  }

  return (
    <div
      style={{ background: "linear-gradient(135deg, #0b1120 0%, #0f172a 50%, #0b1120 100%)" }}
      className="min-h-screen flex flex-col items-center justify-center p-8"
    >
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#3b82f6" }}>
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="text-white text-xl font-bold leading-none">ZestPOS</p>
            <p className="text-slate-400 text-sm">Enterprise Restaurant Suite</p>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Select Device Role</h1>
        <p className="text-slate-400 text-base">Choose how this device will operate in your restaurant</p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {ROLES.map((role) => {
          const Icon = role.icon;
          return (
            <button
              key={role.key}
              onClick={() => handleSelect(role)}
              disabled={!role.available}
              className="relative text-left p-6 rounded-2xl border transition-all duration-200 group"
              style={{
                background: role.available ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                borderColor: role.available ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                cursor: role.available ? "pointer" : "not-allowed",
              }}
              onMouseEnter={(e) => {
                if (role.available) {
                  (e.currentTarget as HTMLElement).style.borderColor = role.color;
                  (e.currentTarget as HTMLElement).style.background = `rgba(${hexToRgb(role.color)}, 0.08)`;
                }
              }}
              onMouseLeave={(e) => {
                if (role.available) {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                }
              }}
            >
              {!role.available && (
                <span
                  className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#64748b" }}
                >
                  Soon
                </span>
              )}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: role.available ? `${role.color}22` : "rgba(255,255,255,0.05)" }}
              >
                <Icon
                  className="w-6 h-6"
                  style={{ color: role.available ? role.color : "#334155" }}
                />
              </div>
              <p
                className="text-base font-bold mb-1"
                style={{ color: role.available ? "#f1f5f9" : "#475569" }}
              >
                {role.label}
              </p>
              <p className="text-sm" style={{ color: role.available ? "#94a3b8" : "#334155" }}>
                {role.description}
              </p>
              {role.available && (
                <div
                  className="mt-4 flex items-center gap-1 text-sm font-semibold"
                  style={{ color: role.color }}
                >
                  Launch <span className="ml-1">→</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-10 text-slate-600 text-sm">v1.0.0 · ZestPOS Enterprise</p>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
