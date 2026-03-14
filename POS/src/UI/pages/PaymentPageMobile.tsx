import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  Banknote,
  CreditCard,
  Wallet,
  CheckCircle,
  Tag,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { useOrder } from "@/context/OrderContext";
import { printerService } from "@/services/local/printer.local.service";
import type { CartItem } from "@/UI/components/menu-selection/CartSidebar";
import type { PaymentMethod, Order } from "@/types/order";
import type { ReceiptData } from "@/types/printer";
import logoPng from "@/assets/Dine-in.png";

const PAYMENT_METHODS: { icon: typeof Banknote; label: string; method: PaymentMethod }[] = [
  { icon: Banknote, label: "Cash", method: "CASH" },
  { icon: CreditCard, label: "Card", method: "CARD" },
  { icon: Wallet, label: "E-Wallet", method: "EWALLET" },
];

const QUICK_DISCOUNT_PCT = [5, 10, 15, 20];

export default function PaymentPageMobile() {
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

  const isAssistanceOrder = activeOrder !== null && activeOrder.originTerminal.type === "KIOSK";

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [tender, setTender] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountInput, setDiscountInput] = useState("");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [waitingCompletion, setWaitingCompletion] = useState(false);

  const methodRef = useRef<PaymentMethod | null>(null);
  methodRef.current = selectedMethod;

  const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
  const tax = Math.round(subtotal * 0.1 * 100) / 100;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const grandTotal = Math.round((afterDiscount + tax) * 100) / 100;
  const tenderedAmount = parseFloat(tender) || 0;
  const change = tenderedAmount > grandTotal ? Math.round((tenderedAmount - grandTotal) * 100) / 100 : 0;
  const remaining = Math.max(0, Math.round((grandTotal - tenderedAmount) * 100) / 100);

  const roundedBase = Math.ceil(grandTotal / 5) * 5;
  const quickAmounts = [roundedBase, roundedBase + 5, roundedBase + 10];

  useEffect(() => {
    if (items.length === 0) navigate("/pos");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      items: items.map((i) => ({ name: i.name, quantity: i.qty, price: i.price, total: i.price * i.qty })),
      subtotal,
      charges: [
        { name: "Tax 10%", amount: tax },
        ...(discountAmount > 0 ? [{ name: "Discount", amount: -discountAmount }] : []),
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
    setTimeout(() => navigate("/pos"), 2000);
  };

  const handleComplete = async () => {
    if (!selectedMethod || placing || items.length === 0) return;
    setPlacing(true);
    setWaitingCompletion(true);
    try {
      if (activeOrder && activeOrder.status !== "DRAFT") {
        completeOrder(activeOrder.orderId, selectedMethod);
      } else {
        await completeDirectOrder(items, selectedMethod);
        if (activeOrder?.status === "DRAFT") clearActiveOrder();
      }
    } catch (err) {
      console.error("Order completion failed:", err);
      setWaitingCompletion(false);
      setPlacing(false);
    }
  };

  const onKey = (k: string) => {
    if (k === "C") { setTender(""); return; }
    if (k === "." && tender.includes(".")) return;
    setTender((p) => (p === "" || p === "0" ? k : p + k));
  };

  const applyDiscount = (val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0 && n <= subtotal) {
      setDiscountAmount(Math.round(n * 100) / 100);
    }
    setDiscountInput(val);
  };

  const clearDiscount = () => {
    setDiscountAmount(0);
    setDiscountInput("");
  };

  /* ── Success screen ── */
  if (success) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface safe-area gap-4">
        <CheckCircle className="w-20 h-20" style={{ color: "var(--color-success)" }} strokeWidth={1.5} />
        <h2 className="text-primary text-2xl font-bold">Order Complete!</h2>
        <p className="text-muted text-sm">Returning to menu…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-surface font-sans safe-area">

      {/* ══ HEADER ══ */}
      <header
        className="shrink-0 flex items-center gap-3 px-4 h-13 border-b"
        style={{
          backgroundColor: "var(--color-surface-raised)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <button
          onClick={() => navigate("/pos")}
          className="btn-back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-primary font-bold flex-1 text-sm">
          {isAssistanceOrder ? "Complete at Cashier" : "Payment"}
        </span>
        <span className="font-bold text-base" style={{ color: "var(--color-success)" }}>
          ${grandTotal.toFixed(2)}
        </span>
      </header>

      {/* ══ AMOUNT DISPLAY ══ */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ backgroundColor: "var(--color-surface-sunken)" }}
      >
        <p className="text-muted text-xs text-center mb-1">
          {tenderedAmount > 0 && tenderedAmount < grandTotal
            ? `Remaining · $${remaining.toFixed(2)}`
            : "Amount to Pay"}
        </p>
        <p
          className="text-center text-4xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          ${grandTotal.toFixed(2)}
        </p>
        {/* Tender input (read-only, driven by numpad) */}
        <div
          className="h-12 rounded-xl flex items-center px-4 border"
          style={{
            backgroundColor: "var(--color-surface-raised)",
            borderColor: tenderedAmount > 0 ? "var(--color-brand)" : "var(--color-border-default)",
          }}
        >
          <span className="text-muted text-sm mr-2">$</span>
          <span className="flex-1 text-center text-2xl font-bold text-primary">
            {tender || <span className="text-disabled">0.00</span>}
          </span>
          {change > 0 && (
            <span className="text-xs font-semibold shrink-0" style={{ color: "var(--color-success)" }}>
              +${change.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* ══ QUICK AMOUNTS ══ */}
      <div className="shrink-0 grid grid-cols-4 gap-2 px-4 py-2">
        <button
          onClick={() => setTender(grandTotal.toFixed(2))}
          className="h-9 rounded-xl text-xs font-bold text-brand-inverted transition active:scale-95"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          Exact
        </button>
        {quickAmounts.map((a) => (
          <button
            key={a}
            onClick={() => setTender(a.toFixed(2))}
            className="h-9 rounded-xl text-xs font-semibold border transition active:scale-95"
            style={{
              backgroundColor: "var(--color-surface-raised)",
              borderColor: "var(--color-border-default)",
              color: "var(--color-text-secondary)",
            }}
          >
            ${a}
          </button>
        ))}
      </div>

      {/* ══ NUMPAD (fills remaining space) ══ */}
      <div className="flex-1 grid grid-cols-3 grid-rows-4 gap-2 px-4 py-1 min-h-0">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "."].map((k) => (
          <button
            key={k}
            onClick={() => onKey(k)}
            className="rounded-xl text-xl font-semibold border transition active:scale-95"
            style={{
              backgroundColor: k === "C"
                ? "var(--color-danger-subtle)"
                : "var(--color-surface-raised)",
              borderColor: "var(--color-border-default)",
              color: k === "C"
                ? "var(--color-danger-text)"
                : "var(--color-text-primary)",
            }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* ══ DISCOUNT (collapsible) ══ */}
      <div
        className="shrink-0 border-t"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <button
          onClick={() => setDiscountOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5"
        >
          <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            <Tag className="w-3.5 h-3.5" />
            Discount
            {discountAmount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                style={{ backgroundColor: "var(--color-success-subtle)", color: "var(--color-success-text)" }}>
                -${discountAmount.toFixed(2)}
              </span>
            )}
          </span>
          {discountOpen
            ? <ChevronUp className="w-4 h-4 text-muted" />
            : <ChevronDown className="w-4 h-4 text-muted" />
          }
        </button>

        {discountOpen && (
          <div
            className="px-4 pb-3 flex flex-col gap-2"
            style={{ backgroundColor: "var(--color-surface-sunken)" }}
          >
            {/* Quick % */}
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_DISCOUNT_PCT.map((pct) => {
                const amt = Math.round(subtotal * (pct / 100) * 100) / 100;
                const isActive = discountAmount === amt;
                return (
                  <button
                    key={pct}
                    onClick={() => isActive ? clearDiscount() : applyDiscount(amt.toFixed(2))}
                    className="py-1.5 rounded-lg text-xs font-bold border transition active:scale-95"
                    style={{
                      backgroundColor: isActive ? "var(--color-brand)" : "var(--color-surface-raised)",
                      borderColor: isActive ? "var(--color-brand)" : "var(--color-border-default)",
                      color: isActive ? "var(--color-brand-text)" : "var(--color-text-secondary)",
                    }}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
            {/* Custom $ input */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted shrink-0">Custom ($)</span>
              <div
                className="flex-1 flex items-center border rounded-lg overflow-hidden"
                style={{
                  backgroundColor: "var(--color-surface-raised)",
                  borderColor: "var(--color-border-default)",
                }}
              >
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discountInput}
                  onChange={(e) => applyDiscount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-1.5 text-sm outline-none bg-transparent text-primary"
                  style={{ color: "var(--color-text-primary)" }}
                />
                {discountAmount > 0 && (
                  <button onClick={clearDiscount} className="px-2 text-muted hover:text-danger">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ PAYMENT METHODS ══ */}
      <div
        className="shrink-0 border-t px-4 py-3"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <p className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-2">Payment Method</p>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map(({ icon: Icon, label, method }) => {
            const isSelected = selectedMethod === method;
            return (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl border font-medium text-xs transition active:scale-95"
                style={{
                  backgroundColor: isSelected ? "var(--color-brand)" : "var(--color-surface-raised)",
                  borderColor: isSelected ? "var(--color-brand)" : "var(--color-border-default)",
                  color: isSelected ? "var(--color-brand-text)" : "var(--color-text-secondary)",
                }}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ BOTTOM BAR — totals + CTA ══ */}
      <div
        className="shrink-0 border-t px-4 pt-3 pb-4 safe-area-bottom"
        style={{
          backgroundColor: "var(--color-surface-raised)",
          borderColor: "var(--color-border-default)",
        }}
      >
        {/* Mini totals row */}
        <div className="flex justify-between text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
          <span>
            Sub ${subtotal.toFixed(2)} · Tax ${tax.toFixed(2)}
            {discountAmount > 0 && ` · Disc -$${discountAmount.toFixed(2)}`}
          </span>
          {change > 0 && (
            <span className="font-semibold" style={{ color: "var(--color-success)" }}>
              Change ${change.toFixed(2)}
            </span>
          )}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleComplete}
          disabled={!selectedMethod || placing || items.length === 0}
          className="w-full h-13 rounded-2xl font-bold text-sm transition active:scale-[0.98]"
          style={{
            backgroundColor: selectedMethod && !placing ? "var(--color-success)" : "var(--color-surface-sunken)",
            color: selectedMethod && !placing ? "#fff" : "var(--color-text-disabled)",
            cursor: !selectedMethod || placing ? "not-allowed" : "pointer",
            opacity: !selectedMethod || placing ? 0.6 : 1,
          }}
        >
          {placing
            ? "Processing…"
            : selectedMethod
              ? `Confirm · $${grandTotal.toFixed(2)} · ${
                  selectedMethod === "CASH" ? "Cash"
                    : selectedMethod === "CARD" ? "Debit Card"
                    : "E-Wallet"
                }`
              : "Select a payment method"}
        </button>

        {/* Back / add more */}
        <button
          onClick={() => navigate("/pos")}
          className="w-full mt-2 h-9 text-xs font-medium rounded-xl transition active:scale-95"
          style={{ color: "var(--color-text-secondary)" }}
        >
          ← Add More Items
        </button>
      </div>
    </div>
  );
}
