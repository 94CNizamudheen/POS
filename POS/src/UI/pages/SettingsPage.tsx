import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Trash2 } from "lucide-react";
import { SETTINGS_NAV } from "@/constants/settingnav";
import ClearDataModal from "../components/settings/ClearDataModal";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [showClearModal, setShowClearModal] = useState(false);

  return (
    <>
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <h1 className="text-lg font-bold text-gray-800 mb-1">Settings</h1>
        <p className="text-sm text-gray-400 mb-6">Configure your POS system</p>

        {/* Main nav cards */}
        <section className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SETTINGS_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all text-left p-5 flex items-start gap-4"
                >
                  <div className={`w-11 h-11 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition shrink-0 mt-0.5" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
            Danger Zone
          </h2>
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Clear All Data</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Permanently delete all orders and held orders from this device.
                </p>
              </div>
              <button
                onClick={() => setShowClearModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-500 border border-red-200 text-sm font-semibold hover:bg-red-100 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                Clear Data
              </button>
            </div>
          </div>
        </section>
      </main>

      {showClearModal && (
        <ClearDataModal onClose={() => setShowClearModal(false)} />
      )}
    </>
  );
}
