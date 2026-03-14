export type KdsStatus = "PENDING" | "IN_PROGRESS" | "READY";

export interface KDSTicketItem {
  id: string;
  name: string;
  quantity: number;
  notes: string;
  toggled: boolean;
}

export interface KDSTicket {
  id: string;
  orderNumber: string;
  orderMode: string;
  receivedTime: string;
  items: KDSTicketItem[];
  status: KdsStatus;
  tableNumber?: string;
  adminId?: string;
}
