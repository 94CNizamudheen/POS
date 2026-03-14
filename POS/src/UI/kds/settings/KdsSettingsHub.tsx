import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, UtensilsCrossed, Wifi, ChevronRight } from "lucide-react";

const NAV_CARDS = [
  {
    path: "/kds/settings/style",
    icon: Palette,
    label: "Display Style",
    description: "Ticket card colors, fonts, item styles, elapsed time indicators, grid layout.",
  },
  {
    path: "/kds/settings/departments",
    icon: UtensilsCrossed,
    label: "Kitchen Departments",
    description: "Define kitchen department groups shown in the KDS header for filtering.",
  },
  {
    path: "/kds/settings/connection",
    icon: Wifi,
    label: "POS Connection",
    description: "Connect this KDS to a POS master via WebSocket.",
  },
];

export default function KdsSettingsHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/kds")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to KDS
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <h1 className="text-xl font-bold text-gray-900">KDS Settings</h1>
      </div>

      {/* Nav cards */}
      <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
        <p className="text-sm text-gray-500 mb-6">Configure this Kitchen Display Station.</p>

        <div className="flex flex-col gap-4">
          {NAV_CARDS.map(({ path, icon: Icon, label, description }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 bg-white text-left transition-all hover:border-orange-400 hover:bg-orange-50"
            >
              <div className="p-3 rounded-lg bg-orange-100 shrink-0">
                <Icon size={22} className="text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-base">{label}</p>
                <p className="text-sm text-gray-500 mt-0.5 leading-snug">{description}</p>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
