import { useNavigate } from "react-router-dom";
import { useOrder } from "@/context/OrderContext";

export default function IncomingOrderBadge() {
  const navigate = useNavigate();
  const { incomingOrders } = useOrder();

  if (incomingOrders.length === 0) return null;

  return (
    <button
      onClick={() => navigate("/incoming")}
      className="relative w-9 h-9 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
      title="Incoming orders"
    >
      🛎
      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
        {incomingOrders.length}
      </span>
    </button>
  );
}
