import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { ThemeSettings } from "@/UI/kds/tickets/ticket.types";
import { appStateApi } from "@/services/appStateDb";

interface SettingsContextType {
  settings: ThemeSettings;
  updateSettings: (newSettings: Partial<ThemeSettings>) => void;
  resetSettings: () => void;
}

const KdsSettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings: ThemeSettings = {
  cardBgColor: "#ffffff",
  cardBorderRadius: "8px",
  cardShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  headerTextColor: "#ffffff",
  headerFontSize: "18px",
  headerFontWeight: "600",
  elapsedColor0to5: "#f97316",
  elapsedColor5to10: "#ef4444",
  elapsedColor10to15: "#3b82f6",
  elapsedColor15plus: "#7c3aed",
  bodyBgColor: "#fff7ed",
  bodyTextColor: "#1f2937",
  completedCardBg: "#16a34a",
  completedTextColor: "#ffffff",
  itemPendingBg: "#3b82f6",
  itemPendingBorder: "#1e40af",
  itemPendingText: "#ffffff",
  itemCompletedBg: "#16a34a",
  itemCompletedBorder: "#15803d",
  itemCompletedText: "#ffffff",
  itemBorderRadius: "8px",
  itemPadding: "12px",
  itemFontSize: "14px",
  itemFontWeight: "500",
  allCompletedItemPendingBg: "#3b82f6",
  allCompletedItemPendingBorder: "#1e40af",
  buttonBgColor: "#1f2937",
  buttonTextColor: "#ffffff",
  buttonHoverBg: "#111827",
  buttonBorderRadius: "8px",
  buttonFontSize: "14px",
  buttonFontWeight: "600",
  buttonPadding: "12px",
  showAdminId: true,
  showPreparationTime: true,
  autoMarkDone: true,
  primaryColor: "orange",
  pageGridCols: "4",
  pageGap: "16px",
  pageBgColor: "#f9fafb",
  groupSwitcherStyle: "tabs",
  assignedGroupIds: "[]",
};

export function KdsSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  // Load from DB on mount
  useEffect(() => {
    appStateApi.get().then((s) => {
      try {
        const stored: Partial<ThemeSettings> = s.kds_display_settings
          ? JSON.parse(s.kds_display_settings)
          : {};
        setSettings({ ...defaultSettings, ...stored });
      } catch {
        setSettings(defaultSettings);
      }
      setLoaded(true);
    });
  }, []);

  // Persist to DB whenever settings change (skip initial default before load)
  useEffect(() => {
    if (!loaded) return;
    appStateApi.setKdsDisplaySettings(JSON.stringify(settings));
  }, [settings, loaded]);

  const updateSettings = (newSettings: Partial<ThemeSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    appStateApi.setKdsDisplaySettings("{}");
  };

  return (
    <KdsSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </KdsSettingsContext.Provider>
  );
}

export function useKdsSettings() {
  const ctx = useContext(KdsSettingsContext);
  if (!ctx) throw new Error("useKdsSettings must be used within KdsSettingsProvider");
  return ctx;
}
