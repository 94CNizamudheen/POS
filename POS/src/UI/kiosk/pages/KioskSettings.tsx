import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wifi, WifiOff, Save } from "lucide-react";
import { orderWebSocketService } from "@/services/kiosk/orderWebSocket/orderWebSocket.service";
import {
  getPosUrl,
  getTerminalId,
  saveConnectionConfig,
} from "@/services/kiosk/connectionConfig";
import { useApp, type KioskPosition } from "@/context/kiosk/AppContext";
import { useOrder } from "@/context/kiosk/OrderContext";

const KIOSK_PREFIX = "KIOSK-";

export default function KioskSettings() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [terminalSuffix, setTerminalSuffix] = useState("1");
  const [saved, setSaved] = useState(false);
  const { position, setPosition } = useApp();
  const { isConnected } = useOrder();

  // Load saved config from DB on mount
  useEffect(() => {
    getPosUrl().then(setUrl);
    getTerminalId().then((id) => {
      setTerminalSuffix(id.startsWith(KIOSK_PREFIX) ? id.slice(KIOSK_PREFIX.length) : id);
    });
  }, []);

  async function handleSave() {
    if (!url.trim() || !terminalSuffix.trim()) return;
    const terminalId = `${KIOSK_PREFIX}${terminalSuffix.trim()}`;
    await saveConnectionConfig(url, terminalId);
    orderWebSocketService.init(url.trim(), terminalId, "KIOSK");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F1F1EC" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-black/10">
        <button
          onClick={() => navigate("/kiosk")}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">POS Connection</h1>
        <div className="ml-auto flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
              <Wifi className="w-4 h-4" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
              <WifiOff className="w-4 h-4" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-col items-center justify-center flex-1 px-8 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8 flex flex-col gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              POS WebSocket URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="ws://192.168.1.5:3001"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm font-mono focus:outline-none focus:border-gray-600 transition"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Get this from the POS → Settings → Connection page
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Terminal ID</label>
            <div className="flex items-stretch rounded-xl border-2 border-gray-200 overflow-hidden focus-within:border-gray-600 transition">
              <span className="flex items-center px-4 bg-gray-100 text-sm font-mono font-bold text-gray-500 border-r-2 border-gray-200 select-none">
                KIOSK-
              </span>
              <input
                type="text"
                value={terminalSuffix}
                onChange={(e) => setTerminalSuffix(e.target.value.replace(/\s/g, ""))}
                placeholder="1"
                className="flex-1 px-4 py-3 text-sm font-mono focus:outline-none bg-white"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Terminal ID will be saved as{" "}
              <span className="font-mono font-semibold text-gray-600">
                KIOSK-{terminalSuffix || "…"}
              </span>
            </p>
          </div>

          {/* Kiosk Position */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Kiosk Position
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Set to <strong>Same</strong> if this kiosk is side-by-side with the POS counter. The
              cashier can pull the cart directly — no "Move to POS" button shown.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["SAME", "DISTANCE"] as KioskPosition[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPosition(p)}
                  className="py-3 rounded-xl border-2 font-bold text-sm transition-all"
                  style={{
                    borderColor: position === p ? "#B5E533" : "#e5e7eb",
                    backgroundColor: position === p ? "#f8ffe0" : "#fff",
                    color: position === p ? "#5a8800" : "#6b7280",
                  }}
                >
                  {p === "SAME" ? "⇄ Same Position" : "↔ Distance"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!url.trim() || !terminalSuffix.trim()}
            className="w-full py-3.5 flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#B5E533", color: "#1C1C1C" }}
          >
            <Save className="w-4 h-4" />
            {saved ? "Saved & Reconnecting…" : "Save & Connect"}
          </button>

          {saved && (
            <p className="text-center text-sm text-green-600 font-medium -mt-2">
              Connecting to {url}…
            </p>
          )}
        </div>

        {/* Current config summary */}
        <div className="w-full max-w-md mt-6 bg-white/60 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Current Config
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">POS URL</span>
              <span className="font-mono text-gray-700">{url || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Terminal ID</span>
              <span className="font-mono text-gray-700">
                {terminalSuffix ? `KIOSK-${terminalSuffix}` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
