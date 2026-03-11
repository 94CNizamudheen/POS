import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { appLocalService } from "@/services/local/app.local.service";
import { RefreshCw, Wifi, WifiOff, Monitor, Smartphone, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ServerInfo {
  ip: string;
  port: number;
  wsUrl: string;
}

interface TerminalInfo {
  terminalId: string;
  terminalType: string;
}

export default function ConnectionSettingsPage() {
  const navigate = useNavigate();
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [terminals, setTerminals] = useState<TerminalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [kioskPositions, setKioskPositions] = useState<Record<string, "SAME" | "DISTANCE">>({});

  const kioskTerminals = terminals.filter((t) => t.terminalType === "KIOSK");

  useEffect(() => {
    kioskTerminals.forEach(({ terminalId }) => {
      appLocalService.getKioskPosition(terminalId)
        .then((v) => {
          if (v) setKioskPositions((prev) => ({ ...prev, [terminalId]: v }));
        })
        .catch(console.error);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminals]);

  async function setKioskPosition(kioskId: string, pos: "SAME" | "DISTANCE") {
    setKioskPositions((prev) => ({ ...prev, [kioskId]: pos }));
    await appLocalService.setKioskPosition(kioskId, pos);
    if (pos === "SAME") {
      await appLocalService.setPairedKioskId(kioskId);
    } else {
      const current = await appLocalService.getPairedKioskId();
      if (current === kioskId) await appLocalService.clearPairedKioskId();
    }
  }

  const fetchAll = useCallback(async () => {
    try {
      const [info, connected] = await Promise.all([
        invoke<ServerInfo>("get_server_info"),
        invoke<TerminalInfo[]>("get_connected_terminals"),
      ]);
      setServerInfo(info);
      setTerminals(connected);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    setPolling(true);
    const id = setInterval(async () => {
      const connected = await invoke<TerminalInfo[]>("get_connected_terminals").catch(() => []);
      setTerminals(connected);
    }, 5000);
    return () => { clearInterval(id); setPolling(false); };
  }, []);

  const kioskCount = terminals.filter((t) => t.terminalType === "KIOSK").length;
  const posCount = terminals.filter((t) => t.terminalType === "POS").length;

  return (
    <main className="flex-1 overflow-y-auto px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/settings")}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Connection & Terminals</h1>
          <p className="text-xs text-gray-400">WebSocket server and connected devices</p>
        </div>
      </div>

      {/* Connection Details */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Connection Details
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">Loading…</div>
          ) : serverInfo ? (
            <div className="divide-y divide-gray-50">
              <Row label="Local IP Address" value={serverInfo.ip} mono />
              <Row label="WebSocket Port" value={String(serverInfo.port)} mono />
              <Row
                label="WebSocket URL"
                value={serverInfo.wsUrl}
                mono
                highlight
                hint="Share this URL with KIOSK terminals to connect"
              />
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-red-400">
              Failed to load server info
            </div>
          )}
        </div>
      </section>

      {/* Connected Terminals */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Connected Terminals
            <span className="ml-2 text-green-500 normal-case font-bold">
              {terminals.length} online
            </span>
          </h2>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-600 transition font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${polling ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm">
            <Smartphone className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-gray-700">{kioskCount}</span>
            <span className="text-xs text-gray-400">Kiosk{kioskCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm">
            <Monitor className="w-4 h-4 text-green-500" />
            <span className="text-sm font-bold text-gray-700">{posCount}</span>
            <span className="text-xs text-gray-400">POS</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {terminals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
              <WifiOff className="w-8 h-8" />
              <p className="text-sm font-medium">No terminals connected</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Terminal ID</th>
                  <th className="text-left px-5 py-3">Type</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {terminals.map((t) => (
                  <tr key={t.terminalId} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-gray-700">{t.terminalId}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        t.terminalType === "KIOSK"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {t.terminalType}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                        <Wifi className="w-3.5 h-3.5" />
                        Connected
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Kiosk Position */}
      {kioskTerminals.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Kiosk Position
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {kioskTerminals.map(({ terminalId }) => {
              const pos = kioskPositions[terminalId] ?? "DISTANCE";
              return (
                <div key={terminalId} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 font-mono">{terminalId}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {pos === "SAME"
                        ? "Side-by-side — Pull Cart button shown"
                        : "Remote — customer walks to counter"}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {(["SAME", "DISTANCE"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setKioskPosition(terminalId, p)}
                        className="px-4 py-2 rounded-xl border-2 font-semibold text-xs transition-all"
                        style={{
                          borderColor: pos === p ? "#22c55e" : "#e5e7eb",
                          backgroundColor: pos === p ? "#f0fdf4" : "#fff",
                          color: pos === p ? "#15803d" : "#6b7280",
                        }}
                      >
                        {p === "SAME" ? "⇄ Same" : "↔ Distance"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function Row({
  label, value, mono, highlight, hint,
}: {
  label: string; value: string; mono?: boolean; highlight?: boolean; hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        {hint && <p className="text-xs text-gray-300 mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-sm font-semibold ${highlight ? "text-green-600" : "text-gray-700"} ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
        <button
          onClick={copy}
          className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition font-medium"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
