import { motion } from "framer-motion";
import type { PromoMediaItem } from "@/types/customer-display";
import PromoSlideshow from "./PromoSlideshow";

interface Props {
  logoUrl: string | null;
  welcomeMessage: string;
  promoMedia: PromoMediaItem[];
}

export default function CustomerDisplayIdle({ logoUrl, welcomeMessage, promoMedia }: Props) {
  return (
    <div className="fixed inset-0 bg-gray-950 p-8">
      <div className="h-full w-full grid grid-cols-2 gap-8 rounded-3xl bg-gray-900/40 backdrop-blur-md shadow-2xl p-8">
        {/* Slideshow */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative h-full w-full rounded-2xl overflow-hidden bg-black/10 flex items-center justify-center"
        >
          <PromoSlideshow media={promoMedia} logoUrl={logoUrl} />
        </motion.div>

        {/* Welcome text */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col items-center justify-center text-center p-10 rounded-2xl bg-gray-950 shadow-inner"
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo"
              className="max-w-48 h-auto mb-8 object-contain"
            />
          )}

          <h1 className="text-5xl font-extrabold tracking-tight text-white leading-tight">
            {welcomeMessage}
          </h1>

          <p className="mt-6 text-lg text-gray-400 max-w-xl">
            Welcome! Please proceed with your order or wait for assistance.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
