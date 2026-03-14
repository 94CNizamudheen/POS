import { ShoppingBag, Plus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOrder } from "@/context/kiosk/OrderContext";

export default function PosOrderBanner() {
  const navigate = useNavigate();
  const {
    posAssignedOrder,
    clearPosAssignedOrder,
    acceptOrder,
  } = useOrder();

  if (!posAssignedOrder) return null;

  const order = posAssignedOrder;
  const total = order.total;

  function handleAddMore() {
    // Dismiss the banner but KEEP activeOrder so Menu.tsx can sync cart changes
    // and pass the correct orderId to payment.
    clearPosAssignedOrder();
    acceptOrder(order.orderId); // transitions PENDING_KIOSK → TRANSFERRED
  }

  function handleProceedToPayment() {
    const orderNumber = order.orderNumber;
    const items = order.items;
    const orderTotal = order.total;
    const orderId = order.orderId;
    clearPosAssignedOrder();
    acceptOrder(orderId); // transitions PENDING_KIOSK → TRANSFERRED, signals POS
    navigate("/kiosk/payment", {
      state: {
        orderId, // needed by Payment to complete the existing order
        orderNumber,
        cartItems: items.map((i) => ({
          id: i.productId,
          name: i.name,
          price: i.price,
          qty: i.qty,
        })),
        total: orderTotal,
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="flex flex-col gap-5 rounded-3xl px-8 py-8 shadow-2xl w-full max-w-md mx-4"
        style={{ backgroundColor: "#F1F1EC" }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#B5E533" }}
          >
            <ShoppingBag className="w-7 h-7 text-black" />
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Order
          </p>
          <p className="text-4xl font-extrabold text-gray-900">
            #{order.orderNumber}
          </p>

          <p className="text-xs text-gray-400 text-center">
            Review the items below. You can add more or go straight to payment.
          </p>
        </div>

        {/* Items */}
        <div className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-white">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Items added for you
            </span>
          </div>

          <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center text-black shrink-0"
                    style={{ backgroundColor: "#B5E533" }}
                  >
                    {item.qty}
                  </span>
                  <span className="text-sm font-semibold text-gray-800 line-clamp-1">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-600 shrink-0 ml-2">
                  ${(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <span className="text-sm font-bold text-gray-700">Total</span>
            <span className="text-base font-extrabold text-gray-900">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={handleProceedToPayment}
            className="w-full py-4 rounded-full font-extrabold text-base text-black transition-all active:scale-95 hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: "#B5E533" }}
          >
            Proceed to Payment
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleAddMore}
            className="w-full py-3 rounded-full border-2 border-gray-300 text-gray-700 font-bold text-sm hover:border-gray-400 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add More Items
          </button>
        </div>
      </div>
    </div>
  );
}
