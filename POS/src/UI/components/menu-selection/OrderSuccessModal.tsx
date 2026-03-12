import { CheckCircle, Banknote, CreditCard, Wallet } from "lucide-react";
import type { Order, PaymentMethod } from "@/types/order";

const paymentIcon: Record<PaymentMethod, typeof Banknote> = {
  CASH: Banknote,
  CARD: CreditCard,
  EWALLET: Wallet,
};

const paymentLabel: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Debit Card",
  EWALLET: "E-Wallet",
};

interface Props {
  order: Order;
  onClose: () => void;
}

export default function OrderSuccessModal({ order, onClose }: Props) {
  const method = (order.paymentMethod ?? "CASH") as PaymentMethod;
  const PayIcon = paymentIcon[method] ?? Banknote;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm">
      <div className="bg-surface-raised rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-success px-6 py-6 flex flex-col items-center gap-2">
          <CheckCircle className="w-14 h-14 text-white" strokeWidth={1.5} />
          <h2 className="text-white text-xl font-bold tracking-wide">
            Order Complete!
          </h2>
          <span className="text-green-100 text-sm font-medium">
            #{order.orderNumber}
          </span>
        </div>

        {/* Items */}
        <div className="px-6 py-4 max-h-48 overflow-y-auto border-b border-subtle">
          {order.items.map((item) => (
            <div
              key={item.productId}
              className="flex justify-between text-sm py-1"
            >
              <span className="text-secondary">
                {item.name} <span className="text-muted">× {item.qty}</span>
              </span>
              <span className="text-secondary font-medium">
                ${item.subtotal.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-6 py-3 flex flex-col gap-1 border-b border-dashed border-default">
          <div className="flex justify-between text-xs text-muted">
            <span>Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted">
            <span>Tax 10%</span>
            <span>${order.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold mt-1">
            <span className="text-danger">Total</span>
            <span className="text-success">${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="px-6 py-3 flex items-center gap-2 text-sm text-secondary border-b border-subtle">
          <PayIcon className="w-4 h-4 text-success" />
          <span>
            Paid via <strong>{paymentLabel[method]}</strong>
          </span>
        </div>

        {/* Close */}
        <div className="px-6 py-4">
          <button
            onClick={onClose}
            className="w-full py-3 bg-success hover:bg-success text-white font-bold rounded-xl transition text-sm"
          >
            New Order
          </button>
        </div>
      </div>
    </div>
  );
}
