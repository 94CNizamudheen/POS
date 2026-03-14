import type { Order } from "@/types/order";

type Handler = (order: Order) => void;
let _handler: Handler | null = null;

export const orderAssignedBridge = {
  register: (fn: Handler) => { _handler = fn; },
  trigger: (order: Order) => { _handler?.(order); },
};
