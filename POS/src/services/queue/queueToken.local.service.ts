import { invoke } from "@tauri-apps/api/core";
import type { QueueStatus, QueueToken } from "@/types/queue";

interface QueueTokenRaw {
  id: string;
  ticket_id?: string | null;
  ticket_number?: string | null;
  token_number: number;
  status: string;
  source?: string | null;
  order_mode?: string | null;
  created_at: string;
  called_at?: string | null;
  served_at?: string | null;
}

function toRust(token: QueueToken): QueueTokenRaw {
  return {
    id: token.id,
    ticket_id: token.ticketId ?? null,
    ticket_number: token.ticketNumber ?? null,
    token_number: token.tokenNumber,
    status: token.status,
    source: token.source ?? null,
    order_mode: token.orderMode ?? null,
    created_at: token.createdAt,
    called_at: token.calledAt ?? null,
    served_at: token.servedAt ?? null,
  };
}

function fromRust(t: QueueTokenRaw): QueueToken {
  return {
    id: t.id,
    ticketId: t.ticket_id,
    ticketNumber: t.ticket_number,
    tokenNumber: t.token_number,
    status: t.status as QueueStatus,
    source: t.source,
    orderMode: t.order_mode,
    createdAt: t.created_at,
    calledAt: t.called_at,
    servedAt: t.served_at,
  };
}

export const queueTokenLocal = {
  async saveToken(token: QueueToken): Promise<void> {
    await invoke("save_queue_token", { token: toRust(token) });
  },

  async getActiveTokens(): Promise<QueueToken[]> {
    try {
      const tokens = await invoke<QueueTokenRaw[]>("get_active_queue_tokens");
      return tokens.map(fromRust);
    } catch {
      return [];
    }
  },

  async updateStatus(tokenNumber: number, status: QueueStatus): Promise<void> {
    await invoke("update_queue_token_status", { tokenNumber, status });
  },
};
