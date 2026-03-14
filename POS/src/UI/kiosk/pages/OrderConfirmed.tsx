import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as orderDb from "@/services/kiosk/orderDb.service";

export default function OrderConfirmed() {
  const navigate = useNavigate();
  const location = useLocation();
  const { total = 0, orderNumber = "", orderId = "" } =
    (location.state as { total?: number; orderNumber?: string; orderId?: string }) ?? {};
  const [countdown, setCountdown] = useState(10);

  // Delete the completed order from local DB as soon as the confirmation page opens
  useEffect(() => {
    if (orderId) {
      orderDb.deleteOrder(orderId).catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown <= 0) { navigate("/kiosk"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  return (
    <div
      className="h-screen flex flex-col items-center justify-center select-none px-6 gap-6"
      style={{ backgroundColor: "#F1F1EC" }}
    >
      <div
        className="w-28 h-28 rounded-full flex items-center justify-center text-5xl"
        style={{ backgroundColor: "#B5E533" }}
      >
        ✓
      </div>

      <h1 className="text-5xl font-extrabold text-gray-900">Order Placed!</h1>
      <p className="text-gray-400 text-lg text-center">
        Thank you for your order. Please collect your receipt.
      </p>

      <div className="bg-white rounded-3xl px-10 py-6 text-center shadow-sm w-full max-w-xs">
        <p className="text-gray-400 text-sm mb-1">Order Number</p>
        <p
          className="text-4xl font-extrabold tracking-widest"
          style={{ color: "#B5E533" }}
        >
          #{orderNumber}
        </p>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-gray-400 text-sm">Total Paid</p>
          <p className="font-extrabold text-gray-800 text-xl">
            ${total.toFixed(2)}
          </p>
        </div>
      </div>

      <button
        onClick={() => navigate("/kiosk")}
        className="px-12 py-4 rounded-full font-extrabold text-black text-lg transition-all hover:opacity-90 active:scale-95"
        style={{ backgroundColor: "#B5E533" }}
      >
        New Order
      </button>

      <p className="text-gray-400 text-sm">
        Returning to start in{" "}
        <span className="font-bold text-gray-600">{countdown}s</span>
      </p>
    </div>
  );
}
