export type QueueStatus = "WAITING" | "CALLED" | "SERVED";

export interface QueueToken {
  id: string;
  ticketId?: string | null;
  ticketNumber?: string | null;
  tokenNumber: number;
  status: QueueStatus;
  source?: string | null;
  orderMode?: string | null;
  createdAt: string;
  calledAt?: string | null;
  servedAt?: string | null;
}
