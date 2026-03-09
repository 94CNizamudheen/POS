import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, ShieldAlert, Trash2 } from "lucide-react";
import { orderLocalService } from "@/services/local/order.local.service";

const CLEAR_PASSWORD = "123qwe";

type Step = "password" | "confirm";

export default function ClearDataModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  function handlePasswordSubmit() {
    if (!password) {
      setError("Password is required");
      triggerShake();
      return;
    }
    if (password !== CLEAR_PASSWORD) {
      setError("Incorrect password");
      setPassword("");
      triggerShake();
      inputRef.current?.focus();
      return;
    }
    setError("");
    setStep("confirm");
  }

  async function handleClearData() {
    if (loading) return;
    setLoading(true);
    try {
      await orderLocalService.clearAllData();
      window.location.reload();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl border border-gray-100">
        {step === "password" ? (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-xl font-bold text-center mb-1 text-gray-900">
              Clear All Data
            </h2>
            <p className="text-center text-gray-400 text-sm mb-6">
              Enter the admin password to continue
            </p>

            <div style={shake ? { animation: "shake 0.4s ease-in-out" } : undefined}>
              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                  placeholder="Password"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-green-400 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs mt-2 text-center">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold rounded-xl py-3 hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 bg-red-500 text-white font-semibold rounded-xl py-3 hover:bg-red-600 transition-colors text-sm"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
              {loading ? (
                <svg className="w-8 h-8 text-red-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <Trash2 className="w-8 h-8 text-red-500" />
              )}
            </div>

            <h2 className="text-xl font-bold text-center mb-2 text-gray-900">
              Are you sure?
            </h2>
            <p className="text-center text-gray-400 text-sm mb-2">
              This will permanently delete all data from the local database.
            </p>
            <p className="text-center text-red-500 text-xs font-semibold mb-6">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold rounded-xl py-3 hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                disabled={loading}
                className="flex-1 bg-red-500 text-white font-semibold rounded-xl py-3 hover:bg-red-600 transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? "Clearing…" : "Clear All Data"}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
