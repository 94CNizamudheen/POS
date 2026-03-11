import type { LucideIcon } from "lucide-react";
import { Printer, Wifi, Trash2 } from "lucide-react";

export interface SettingsNavItem {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  badge?: string;
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    id: "printers",
    title: "Printers",
    description: "Configure receipt and kitchen printers, paper sizes, and print templates.",
    path: "/settings/printers",
    icon: Printer,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
  },
  {
    id: "connection",
    title: "Connection & Terminals",
    description: "WebSocket server info, connected KIOSK terminals, and kiosk position settings.",
    path: "/settings/connection",
    icon: Wifi,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
];

export const DANGER_ITEMS = [
  {
    id: "clear-data",
    title: "Clear All Data",
    description: "Permanently delete all orders and held orders from this device.",
    icon: Trash2,
  },
];
