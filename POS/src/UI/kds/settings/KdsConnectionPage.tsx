import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wifi, WifiOff, ArrowLeft } from "lucide-react";
import {
  getKdsWsUrl,
  setKdsWsUrl,
} from "@/services/kds/kdsConnectionConfig";
import { useKdsWebSocket } from "@/context/kds/KdsWebSocketContext";

export default function KdsConnectionPage() {
  const navigate = useNavigate();
  const [inputUrl, setInputUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const { isConnected, isConnecting, error, connect, disconnect } = useKdsWebSocket();

  useEffect(() => {
    getKdsWsUrl().then((url) => {
      const v = url ?? "";
      setInputUrl(v);
      setSavedUrl(v);
    });
  }, []);

  const handleConnect = async () => {
    if (!inputUrl.trim()) return;
    await setKdsWsUrl(inputUrl.trim());
    setSavedUrl(inputUrl.trim());
    connect(inputUrl.trim());
  };

  const handleDisconnect = () => {
    disconnect();
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Connecting to POS...</p>
          <p className="text-sm text-gray-400 mt-1">{inputUrl}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Connect to POS</h1>
        </div>

        {/* Connected Banner */}
        {isConnected && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <Wifi className="w-5 h-5" />
              Connected to POS
            </div>
            <p className="text-sm text-green-600 mt-1">
              This device is actively receiving orders.
            </p>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isConnected ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                {isConnected ? (
                  <Wifi className="w-6 h-6 text-green-600" />
                ) : (
                  <WifiOff className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {isConnected ? "Connected" : "Not Connected"}
                </h2>
                <p className="text-sm text-gray-500">
                  {isConnected
                    ? "Receiving orders from POS"
                    : "Enter POS server address to connect"}
                </p>
              </div>
            </div>
            {isConnected && (
              <span className="px-4 py-2 rounded-full bg-green-500 text-white text-sm font-medium">
                Active
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                POS Server URL
              </label>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isConnected && handleConnect()}
                placeholder="ws://192.168.1.100:3001"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white font-mono text-sm focus:outline-none focus:border-orange-400"
                disabled={isConnected}
              />
              {isConnected && (
                <p className="text-xs text-orange-500 mt-1">
                  Disconnect first to change the server URL
                </p>
              )}
            </div>

            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="w-full px-6 py-3 rounded-lg bg-red-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
              >
                <WifiOff className="w-5 h-5" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={!inputUrl.trim()}
                className="w-full px-6 py-3 rounded-lg bg-orange-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                <Wifi className="w-5 h-5" />
                Connect
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">
                <strong>Connection Failed:</strong> {error}
              </p>
            </div>
          )}

          {savedUrl && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500">Saved URL</p>
              <p className="text-sm font-mono mt-1 text-gray-900">{savedUrl}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
