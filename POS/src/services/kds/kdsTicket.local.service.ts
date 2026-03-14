import { invoke } from "@tauri-apps/api/core";
import type { KdsStatus } from "@/types/kds";

export interface KDSTicketData {
  id: string;
  ticketNumber: string;
  orderId?: string | null;
  orderModeName?: string | null;
  status: KdsStatus;
  items: string; // JSON string
  totalAmount?: number | null;
  tokenNumber?: number | null;
  createdAt: string;
  updatedAt: string;
}

function toRust(ticket: KDSTicketData) {
  return {
    id: ticket.id,
    ticket_number: ticket.ticketNumber,
    order_id: ticket.orderId ?? null,
    order_mode_name: ticket.orderModeName ?? null,
    status: ticket.status,
    items: ticket.items,
    total_amount: ticket.totalAmount ?? null,
    token_number: ticket.tokenNumber ?? null,
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt,
  };
}

function fromRust(t: any): KDSTicketData {
  return {
    id: t.id,
    ticketNumber: t.ticket_number,
    orderId: t.order_id,
    orderModeName: t.order_mode_name,
    status: t.status as KdsStatus,
    items: t.items,
    totalAmount: t.total_amount,
    tokenNumber: t.token_number,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export const kdsTicketLocal = {
  async saveTicket(ticket: KDSTicketData): Promise<void> {
    await invoke("save_kds_ticket", { ticket: toRust(ticket) });
  },

  async getAllTickets(): Promise<KDSTicketData[]> {
    try {
      const tickets = await invoke<any[]>("get_all_kds_tickets");
      return tickets.map(fromRust);
    } catch {
      return [];
    }
  },

  async getActiveTickets(): Promise<KDSTicketData[]> {
    try {
      const tickets = await invoke<any[]>("get_active_kds_tickets");
      return tickets.map(fromRust);
    } catch {
      return [];
    }
  },

  async getTicketsByStatus(status: KdsStatus): Promise<KDSTicketData[]> {
    try {
      const tickets = await invoke<any[]>("get_kds_tickets_by_status", { status });
      return tickets.map(fromRust);
    } catch {
      return [];
    }
  },

  async updateStatus(ticketId: string, status: KdsStatus): Promise<void> {
    await invoke("update_kds_ticket_status", { ticketId, status });
  },

  async deleteTicket(ticketId: string): Promise<void> {
    await invoke("delete_kds_ticket", { ticketId });
  },
};
