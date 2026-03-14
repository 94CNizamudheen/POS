import { useEffect, useState } from "react";
import { useQueueWebSocket } from "@/context/queue/QueueWebSocketContext";
import { localEventBus, LocalEventTypes } from "@/services/eventbus/LocalEventBus";
import type { QueueToken } from "@/types/queue";
import QueueHeader from "../components/QueueHeader";

function TokenCard({ token, highlight }: { token: QueueToken; highlight: boolean }) {
  return (
    <div
      className={`w-32 h-28 flex items-center justify-center rounded-xl border-2 text-4xl font-bold transition-all duration-300 ${
        highlight
          ? "border-green-400 bg-green-900/40 text-green-300 shadow-lg shadow-green-900/50"
          : "border-gray-600 bg-gray-800 text-gray-200"
      }`}
    >
      {token.tokenNumber}
    </div>
  );
}

export default function QueueDisplay() {
  const { tokens } = useQueueWebSocket();
  const [, rerender] = useState(0);

  useEffect(() => {
    const unsubs = [
      localEventBus.subscribe(LocalEventTypes.QUEUE_UPDATED, () => rerender((n) => n + 1)),
      localEventBus.subscribe(LocalEventTypes.QUEUE_TOKEN_CALLED, () => rerender((n) => n + 1)),
      localEventBus.subscribe(LocalEventTypes.QUEUE_TOKEN_SERVED, () => rerender((n) => n + 1)),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);

  const calledTokens = tokens.filter((t) => t.status === "CALLED");
  const waitingTokens = tokens.filter((t) => t.status === "WAITING");

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <QueueHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Ready for pick up — CALLED tokens */}
        <div className="flex-1 flex flex-col border-r border-gray-700 p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold text-green-400 mb-1">Ready for Pick Up</h2>
          <p className="text-sm text-gray-400 mb-6">
            {calledTokens.length} {calledTokens.length === 1 ? "order" : "orders"}
          </p>

          {calledTokens.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-lg">
              No orders ready
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {calledTokens.map((token) => (
                <TokenCard key={token.id} token={token} highlight />
              ))}
            </div>
          )}
        </div>

        {/* Preparing — WAITING tokens */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-300 mb-1">Preparing</h2>
          <p className="text-sm text-gray-400 mb-6">
            {waitingTokens.length} {waitingTokens.length === 1 ? "order" : "orders"}
          </p>

          {waitingTokens.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-lg">
              No orders in queue
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {waitingTokens.map((token) => (
                <TokenCard key={token.id} token={token} highlight={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
