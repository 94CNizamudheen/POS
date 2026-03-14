import { motion } from "framer-motion";
import type { CustomerDisplayOrderCompletePayload } from "@/types/customer-display";

interface Props {
  data: CustomerDisplayOrderCompletePayload;
  logoUrl: string | null;
}

export default function CustomerDisplayOrderComplete({ data, logoUrl }: Props) {
  return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl rounded-3xl bg-gray-900/40 backdrop-blur-md shadow-2xl p-12 flex flex-col items-center text-center"
      >
        {logoUrl && (
          <img src={logoUrl} alt="Logo" className="max-w-48 h-auto mb-8 object-contain" />
        )}

        {/* Animated checkmark */}
        <motion.svg width="160" height="160" viewBox="0 0 100 100" className="mb-8">
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(76,175,80)"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          <motion.path
            d="M30 52 L44 66 L70 36"
            fill="none"
            stroke="rgb(76,175,80)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
          />
        </motion.svg>

        <h1 className="text-5xl font-bold text-white mb-4">Order Successful!</h1>

        <p className="text-2xl text-gray-400 mb-6">Your order #{data.ticketNumber}</p>

        {data.queueNumber > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-blue-600 text-white rounded-2xl px-12 py-6 mb-8"
          >
            <p className="text-lg">Queue Number</p>
            <p className="text-7xl font-bold">{data.queueNumber}</p>
          </motion.div>
        )}

        <p className="text-3xl font-bold text-white mb-8">
          {data.currencyCode} {data.grandTotal.toFixed(2)}
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <p className="text-3xl font-semibold text-white">Thank You!</p>
          <p className="text-lg text-gray-400 mt-2">We appreciate your order</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
