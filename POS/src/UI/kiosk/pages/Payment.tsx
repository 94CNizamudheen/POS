import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Banknote, CreditCard, Wallet, ArrowLeft } from "lucide-react";
import type { CartItem } from "@/types/product";
import { useOrder } from "@/context/kiosk/OrderContext";

type PaymentMethod = "cash" | "card" | "ewallet";

const paymentOptions: {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "cash",
    label: "Cash",
    description: "Pay with cash at the counter",
    icon: <Banknote size={32} />,
  },
  {
    id: "card",
    label: "Debit / Credit Card",
    description: "Tap or insert your card",
    icon: <CreditCard size={32} />,
  },
  {
    id: "ewallet",
    label: "E-Wallet",
    description: "Pay with mobile wallet / QR",
    icon: <Wallet size={32} />,
  },
];

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeKioskOrder } = useOrder();

  const {
    total = 0,
    cartItems = [] as CartItem[],
    orderId = null as string | null,
  } = (location.state as {
    total?: number;
    cartItems?: CartItem[];
    orderId?: string | null;
  }) ?? {};

  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);

  function handleConfirm() {
    if (!selected || processing) return;
    setProcessing(true);
    completeKioskOrder(orderId, cartItems, selected.toUpperCase());
    // Navigation to /kiosk/confirmed is handled by OrderContext on ORDER_COMPLETED event
  }

  return (
    <div
      className="h-screen flex flex-col select-none"
      style={{ backgroundColor: "#F1F1EC" }}
    >
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center gap-4 shadow-sm">
        <button
          onClick={() => navigate("/kiosk/menu")}
          disabled={processing}
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <ArrowLeft size={18} />
        </button>
        <span
          className="text-2xl"
          style={{ fontFamily: "'Pacifico', cursive" }}
        >
          Delicious
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">Amount to Pay</p>
          <p className="text-6xl font-extrabold" style={{ color: "#B5E533" }}>
            ${total.toFixed(2)}
          </p>
        </div>

        <div className="w-full max-w-md space-y-3">
          {paymentOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => !processing && setSelected(option.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 bg-white transition-all duration-200"
              style={{
                borderColor: selected === option.id ? "#B5E533" : "#e5e7eb",
                backgroundColor: selected === option.id ? "#f8ffe0" : "#ffffff",
              }}
            >
              <div
                style={{
                  color: selected === option.id ? "#7ab800" : "#9ca3af",
                }}
              >
                {option.icon}
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-gray-800">{option.label}</p>
                <p className="text-sm text-gray-400">{option.description}</p>
              </div>
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: selected === option.id ? "#B5E533" : "#d1d5db",
                  backgroundColor:
                    selected === option.id ? "#B5E533" : "transparent",
                }}
              >
                {selected === option.id && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selected || processing}
          className="w-full max-w-md py-4 rounded-full font-extrabold text-lg text-black transition-all duration-200 disabled:opacity-30"
          style={{ backgroundColor: "#B5E533" }}
        >
          {processing ? "Processing…" : "Confirm Payment"}
        </button>
      </div>
    </div>
  );
}
