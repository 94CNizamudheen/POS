import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import PaymentPageMobile from "./PaymentPageMobile";
import logoPng from "@/assets/Dine-in.png";
import {
  Banknote,
  CreditCard,
  Wallet,
  CheckCircle,
  ChevronLeft,
  Tag,
  X,
} from "lucide-react";
import { useOrder } from "@/context/OrderContext";
import { printerService } from "@/services/local/printer.local.service";
import type { CartItem } from "@/UI/components/menu-selection/CartSidebar";
import type { PaymentMethod, Order } from "@/types/order";
import type { ReceiptData } from "@/types/printer";
import dishPlaceholder from "@/assets/dish-placeholder.jpg";

function getProductImage(media?: string): string {
  if (!media || media === "[]") return dishPlaceholder;
  try {
    const parsed = JSON.parse(media) as { filepath: string }[];
    return parsed[0]?.filepath ?? dishPlaceholder;
  } catch {
    return dishPlaceholder;
  }
}

const PAYMENT_METHODS: {
  icon: typeof Banknote;
  label: string;
  method: PaymentMethod;
}[] = [
  { icon: Banknote, label: "Cash", method: "CASH" },
  { icon: CreditCard, label: "Debit Card", method: "CARD" },
  { icon: Wallet, label: "E-Wallet", method: "EWALLET" },
];

const QUICK_DISCOUNTS = [5, 10, 15, 20];

/** Router: renders desktop or mobile payment UI based on screen width */
export default function PaymentPage() {
  const isDesktop = useIsDesktop();
  return isDesktop ? <PaymentPageDesktop /> : <PaymentPageMobile />;
}

function PaymentPageDesktop() {
  const navigate = useNavigate();
  const location = useLocation();
  const items: CartItem[] = location.state?.items ?? [];

  const {
    activeOrder,
    completeOrder,
    completeDirectOrder,
    clearActiveOrder,
    stashWalkupCart,
    lastCompletedOrder,
    clearCompletedOrder,
  } = useOrder();

  const isAssistanceOrder =
    activeOrder !== null && activeOrder.originTerminal.type === "KIOSK";

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [tender, setTender] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountInput, setDiscountInput] = useState("");
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [waitingCompletion, setWaitingCompletion] = useState(false);

  // Capture selected method in a ref so async callbacks see current value
  const methodRef = useRef<PaymentMethod | null>(null);
  methodRef.current = selectedMethod;

  const subtotal =
    Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
  const tax = Math.round(subtotal * 0.1 * 100) / 100;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const grandTotal = Math.round((afterDiscount + tax) * 100) / 100;
  const tenderedAmount = parseFloat(tender) || 0;
  const change =
    tenderedAmount > grandTotal
      ? Math.round((tenderedAmount - grandTotal) * 100) / 100
      : 0;

  // Generate dynamic quick amounts based on grandTotal
  const roundedBase = Math.ceil(grandTotal / 5) * 5;
  const quickAmounts = [roundedBase, roundedBase + 5, roundedBase + 10];

  // Redirect if no items
  useEffect(() => {
    if (items.length === 0) navigate("/");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for order completion (walk-up or KIOSK WS)
  useEffect(() => {
    if (!waitingCompletion || !lastCompletedOrder) return;
    setWaitingCompletion(false);
    printAndFinish(lastCompletedOrder);
  }, [lastCompletedOrder, waitingCompletion]); // eslint-disable-line react-hooks/exhaustive-deps

  const printAndFinish = async (order: Order) => {
    const method = methodRef.current ?? "CASH";
    const receiptData: ReceiptData = {
      ticket_number: order.orderNumber,
      location_name: "POS",
      order_mode: isAssistanceOrder ? "Kiosk Assist" : "Walk-in",
      logo_url: logoPng,
      items: items.map((i) => ({
        name: i.name,
        quantity: i.qty,
        price: i.price,
        total: i.price * i.qty,
      })),
      subtotal,
      charges: [
        { name: "Tax 10%", amount: tax },
        ...(discountAmount > 0
          ? [{ name: "Discount", amount: -discountAmount }]
          : []),
      ],
      total: order.total,
      payment_method: method,
      tendered: tenderedAmount || order.total,
      change: Math.max(0, (tenderedAmount || order.total) - order.total),
      timestamp: new Date().toLocaleString(),
    };
    try {
      await printerService.printByTemplate(receiptData);
    } catch (err) {
      console.error("Print failed:", err);
    }
    clearCompletedOrder();
    stashWalkupCart([]);
    setPlacing(false);
    setSuccess(true);
    setTimeout(() => navigate("/"), 2500);
  };

  const handleComplete = async () => {
    if (!selectedMethod || placing || items.length === 0) return;
    setPlacing(true);
    setWaitingCompletion(true);
    try {
      if (activeOrder && activeOrder.status !== "DRAFT") {
        completeOrder(activeOrder.orderId, selectedMethod);
        // printAndFinish fires from useEffect when ORDER_COMPLETED WS arrives
      } else {
        await completeDirectOrder(items, selectedMethod);
        if (activeOrder?.status === "DRAFT") clearActiveOrder();
        // lastCompletedOrder is now set → useEffect fires printAndFinish
      }
    } catch (err) {
      console.error("Order completion failed:", err);
      setWaitingCompletion(false);
      setPlacing(false);
    }
  };

  // Numpad handler
  const onKey = (k: string) => {
    if (k === "C") {
      setTender("");
      return;
    }
    if (k === "." && tender.includes(".")) return;
    setTender((p) => (p === "" || p === "0" ? k : p + k));
  };

  const applyDiscount = (val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0 && n <= subtotal) {
      setDiscountAmount(Math.round(n * 100) / 100);
      setDiscountInput(val);
    } else {
      setDiscountInput(val);
    }
  };

  const clearDiscount = () => {
    setDiscountAmount(0);
    setDiscountInput("");
  };

  if (success) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle className="w-24 h-24 text-green-400" strokeWidth={1.5} />
          <h2 className="text-3xl font-bold text-gray-800">Order Complete!</h2>
          <p className="text-gray-400 text-sm">Returning to menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex bg-gray-50 font-sans overflow-hidden safe-area">
      {/* ════════════════ LEFT — Cart Items (40%) ════════════════ */}
      <div className="w-[40%] h-full bg-white border-r border-gray-100 flex flex-col">
        {/* Header */}
        <div className="h-14 px-4 flex items-center gap-3 border-b border-gray-100 shrink-0">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="font-bold text-gray-800 text-sm">Order Summary</h2>
          <span className="ml-auto text-xs text-gray-400">
            {items.reduce((s, i) => s + i.qty, 0)} items
          </span>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5"
            >
              <img
                src={getProductImage(item.media)}
                alt={item.name}
                className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-200"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = dishPlaceholder;
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-400">
                  ${item.price.toFixed(2)} × {item.qty}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-700 shrink-0">
                ${(item.price * item.qty).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="shrink-0 border-t border-dashed border-gray-200 px-4 py-4 space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Tax 10%</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-green-600 font-medium">
              <span>Discount</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <hr className="border-dashed border-gray-200" />
          <div className="flex justify-between text-base font-bold">
            <span className="text-red-500">Total</span>
            <span className="text-green-600">${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ════════════════ CENTER — Promotions + Calculation (35%) ════════════════ */}
      <div className="w-[35%] h-full flex flex-col border-r border-gray-100">
        {/* TOP: Promotions / Discount (35%) */}
        <div className="h-[35%] shrink-0 bg-white border-b border-gray-100 px-4 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-bold text-gray-700">
              Promotions & Discounts
            </h3>
          </div>

          {/* Quick discount buttons */}
          <div className="grid grid-cols-4 gap-2">
            {QUICK_DISCOUNTS.map((pct) => {
              const amt = Math.round(subtotal * (pct / 100) * 100) / 100;
              const isActive = discountAmount === amt;
              return (
                <button
                  key={pct}
                  onClick={() =>
                    isActive ? clearDiscount() : applyDiscount(amt.toFixed(2))
                  }
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    isActive
                      ? "bg-green-400 text-white border-green-400"
                      : "border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50"
                  }`}
                >
                  {pct}%
                </button>
              );
            })}
          </div>

          {/* Manual discount input */}
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-xs text-gray-500 shrink-0">Custom ($)</span>
            <div className="flex-1 flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discountInput}
                onChange={(e) => applyDiscount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
              />
              {discountAmount > 0 && (
                <button
                  onClick={clearDiscount}
                  className="px-2 text-gray-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM: Calculation + Keypad (65%) */}
        <div className="flex-1 bg-gray-50 flex flex-col px-4 py-3 gap-2">
          {/* Totals display */}
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <span className="text-xs text-gray-500">Total</span>
            <span className="text-2xl font-bold text-gray-800">
              ${grandTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center pb-2">
            <span className="text-xs text-gray-500">Change</span>
            <span className="text-xl font-bold text-green-500">
              ${change.toFixed(2)}
            </span>
          </div>

          {/* Tender input */}
          <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden h-12">
            <span className="pl-3 text-gray-400 text-sm font-medium">$</span>
            <input
              className="flex-1 h-full bg-transparent px-2 text-xl font-bold outline-none"
              value={tender}
              inputMode="decimal"
              placeholder="0.00"
              onChange={(e) => {
                const v = e.target.value;
                if (/^\d*\.?\d*$/.test(v)) setTender(v);
              }}
            />
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setTender(grandTotal.toFixed(2))}
              className="py-2 rounded-xl text-xs font-bold bg-green-400 text-white hover:bg-green-500 transition"
            >
              Exact
            </button>
            {quickAmounts.map((a) => (
              <button
                key={a}
                onClick={() => setTender(a.toFixed(2))}
                className="py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 transition"
              >
                ${a}.00
              </button>
            ))}
          </div>

          {/* Numpad */}
          <div className="flex-1 grid grid-cols-3 grid-rows-4 gap-1.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "."].map(
              (k) => (
                <button
                  key={k}
                  onClick={() => onKey(k)}
                  className={`rounded-xl text-lg font-semibold border transition active:scale-95 ${
                    k === "C"
                      ? "border-red-200 text-red-500 hover:bg-red-50 bg-white"
                      : "border-gray-200 bg-white hover:bg-gray-100"
                  }`}
                >
                  {k}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* ════════════════ RIGHT — Payment Methods (25%) ════════════════ */}
      <div className="w-[25%] h-full bg-white flex flex-col px-4 py-4 gap-4">
        <h3 className="text-sm font-bold text-gray-700">Payment Method</h3>

        <div className="flex flex-col gap-3 flex-1">
          {PAYMENT_METHODS.map(({ icon: Icon, label, method }) => {
            const isSelected = selectedMethod === method;
            return (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                className={`flex-1 flex flex-col items-center justify-center gap-2 border-2 rounded-2xl font-semibold text-sm transition ${
                  isSelected
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50"
                }`}
              >
                <Icon
                  className={`w-8 h-8 ${isSelected ? "text-green-500" : "text-gray-400"}`}
                />
                {label}
                {isSelected && (
                  <span className="text-xs font-normal text-green-500">
                    Selected ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleComplete}
          disabled={!selectedMethod || placing || items.length === 0}
          className="w-full py-4 bg-green-400 text-white font-bold rounded-2xl hover:bg-green-500 transition text-sm shadow-md shadow-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {placing
            ? "Processing…"
            : isAssistanceOrder
              ? "Complete at Cashier"
              : `Confirm Payment · $${grandTotal.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
