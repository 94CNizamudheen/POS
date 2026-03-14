import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Wifi, WifiOff, LogOut } from "lucide-react";
import { useOrder } from "@/context/kiosk/OrderContext";
import * as orderDb from "@/services/kiosk/orderDb.service";

// Fixed prefix shown to the customer — matches the letter in POS-assigned order numbers (e.g. "A")
const ORDER_PREFIX = "A";
const MAX_DIGITS = 4;

export default function Welcome() {
  const navigate = useNavigate();
  const { resumeOrderFromDb, isConnected } = useOrder();
  const [showOrderInput, setShowOrderInput] = useState(false);
  const [digits, setDigits] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDigitsChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip non-digits and cap length
    const val = e.target.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
    setDigits(val);
    setLookupError(null);
  }

  async function handleOrderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!digits) {
      setLookupError("Please enter the order number.");
      return;
    }
    const fullNumber = `${ORDER_PREFIX}${digits}`;
    setLookupError(null);
    setLooking(true);
    try {
      const localOrder = await orderDb.getOrderByNumber(fullNumber);
      if (localOrder) {
        resumeOrderFromDb(localOrder);
        navigate("/kiosk/menu");
        return;
      }
      setLookupError(
        `Order #${fullNumber} not found. Please check the number.`,
      );
    } catch {
      setLookupError("Something went wrong. Please try again.");
    } finally {
      setLooking(false);
    }
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    setShowOrderInput(true);
    setDigits("");
    setLookupError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleClose() {
    setShowOrderInput(false);
    setDigits("");
    setLookupError(null);
  }

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center select-none relative"
      style={{ backgroundColor: "#F1F1EC" }}
      onClick={() => {
        if (!showOrderInput) navigate("/kiosk/order-type");
      }}
    >
      {/* Exit to role selection — top left */}
      <div
        className="absolute top-6 left-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 text-gray-500 text-xs font-semibold shadow-sm hover:bg-white hover:text-gray-800 transition"
          title="Switch Role"
        >
          <LogOut className="w-3.5 h-3.5" />
          Switch Role
        </button>
      </div>

      {/* Connection status + settings — bottom right */}
      <div
        className="absolute bottom-6 right-6 flex items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {isConnected ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
            <Wifi className="w-3.5 h-3.5" />
            POS Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-full">
            <WifiOff className="w-3.5 h-3.5" />
            POS Disconnected
          </span>
        )}
        <button
          onClick={() => navigate("/kiosk/settings")}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 transition"
          title="POS Connection Settings"
        >
          <Settings className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      {/* Brand */}
      <h1
        className="text-8xl mb-4"
        style={{ fontFamily: "'Pacifico', cursive", color: "#1C1C1C" }}
      >
        Delicious
      </h1>

      <p className="text-2xl font-semibold text-gray-400 mb-16">
        Self-Service Ordering
      </p>

      {/* CTA */}
      <button
        className="text-2xl font-bold px-16 py-5 rounded-full text-black transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
        style={{ backgroundColor: "#B5E533" }}
        onClick={(e) => {
          e.stopPropagation();
          navigate("/kiosk/order-type");
        }}
      >
        Touch to proceed
      </button>

      <p className="mt-6 text-gray-400 text-base">
        Tap anywhere to get started
      </p>

      {/* Order number entry */}
      {!showOrderInput ? (
        <button
          className="mt-8 text-sm font-semibold text-gray-500 underline underline-offset-2 hover:text-gray-700 transition-colors"
          onClick={handleOpen}
        >
          I have an order number
        </button>
      ) : (
        <form
          onSubmit={handleOrderSubmit}
          className="mt-8 flex flex-col items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-gray-500">
            Enter your order number
          </p>

          {/* Prefix + digit input combined */}
          <div
            className="flex items-center rounded-2xl border-2 overflow-hidden"
            style={{
              borderColor: lookupError ? "#ef4444" : "#d1d5db",
              backgroundColor: "#fff",
            }}
          >
            {/* Fixed prefix — not editable */}
            <div
              className="px-5 py-4 text-3xl font-black tracking-widest border-r-2 border-gray-200 select-none"
              style={{ color: "#B5E533" }}
            >
              {ORDER_PREFIX}
            </div>

            {/* Numeric digits only */}
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={digits}
              onChange={handleDigitsChange}
              placeholder="0 0 0"
              maxLength={MAX_DIGITS}
              className="px-5 py-4 text-3xl font-black tracking-widest text-center text-gray-900 focus:outline-none bg-transparent w-36"
            />
          </div>

          {lookupError && (
            <p className="text-xs text-red-500 font-semibold text-center max-w-xs">
              {lookupError}
            </p>
          )}

          <div className="flex gap-3 mt-1">
            <button
              type="submit"
              disabled={looking || digits.length === 0}
              className="px-8 py-3 rounded-full text-black font-bold text-sm transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#B5E533" }}
            >
              {looking ? "Looking…" : "Continue"}
            </button>
            <button
              type="button"
              className="px-8 py-3 rounded-full border-2 border-gray-300 font-bold text-sm text-gray-600 hover:bg-gray-100 transition-all"
              onClick={handleClose}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
