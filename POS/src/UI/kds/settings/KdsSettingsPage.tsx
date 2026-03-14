import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, RotateCcw } from "lucide-react";
import Left from "./Left";
import Right from "./Right";
import { useKdsSettings } from "@/context/kds/KdsSettingsContext";

export default function KdsSettingsPage() {
  const { settings, updateSettings, resetSettings } = useKdsSettings();
  const [activeSection, setActiveSection] = useState("card");
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/kds/settings")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={18} />
            Settings
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <Palette size={20} className="text-orange-500" />
          <h1 className="text-xl font-bold text-gray-900">Display Style</h1>
        </div>
        <button
          onClick={resetSettings}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-50"
        >
          <RotateCcw size={15} />
          Reset to Default
        </button>
      </div>

      <div className="flex flex-1 border-t overflow-hidden">
        <div className="w-1/2 border-r bg-white overflow-y-auto">
          <Left
            settings={settings}
            updateSettings={updateSettings}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />
        </div>
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          <Right settings={settings} />
        </div>
      </div>
    </div>
  );
}
