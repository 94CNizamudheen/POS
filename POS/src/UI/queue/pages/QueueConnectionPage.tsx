import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueueWebSocket } from "@/context/queue/QueueWebSocketContext";
import {
  getQueueWsUrl,
  setQueueWsUrl,
  clearQueueWsUrl,
} from "@/services/queue/queueConnectionConfig";

export default function QueueConnectionPage() {
  const navigate = useNavigate();
  const { isConnected, isConnecting, error, connect, disconnect } = useQueueWebSocket();
  const [url, setUrl] = useState("");

  useEffect(() => {
    getQueueWsUrl().then((v) => setUrl(v ?? ""));
  }, []);

  const handleConnect = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    await setQueueWsUrl(trimmed);
    connect(trimmed);
  };

  const handleDisconnect = async () => {
    disconnect();
    await clearQueueWsUrl();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-lg font-semibold">Queue Connection</h1>
        <div />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Status badge */}
          <div className="flex justify-center">
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                isConnected
                  ? "bg-green-800/40 text-green-300"
                  : isConnecting
                    ? "bg-yellow-800/40 text-yellow-300"
                    : "bg-gray-800 text-gray-400"
              }`}
            >
              {isConnected ? "Connected" : isConnecting ? "Connecting…" : "Disconnected"}
            </span>
          </div>

          {/* URL input */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">WebSocket Server URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              placeholder="ws://192.168.x.x:3001"
              disabled={isConnected || isConnecting}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 px-4 py-2 rounded-lg">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="flex-1 py-3 rounded-lg bg-red-700 hover:bg-red-600 text-white font-medium transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting || !url.trim()}
                className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition-colors"
              >
                {isConnecting ? "Connecting…" : "Connect"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
