import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PromoMediaItem } from "@/types/customer-display";

interface Props {
  media: PromoMediaItem[];
  logoUrl?: string | null;
  interval?: number;
  className?: string;
}

export default function PromoSlideshow({
  media,
  logoUrl,
  interval = 5000,
  className = "",
}: Props) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % media.length);
  }, [media.length]);

  useEffect(() => {
    clearTimer();
    if (media.length <= 1) return;
    const current = media[index];
    if (!current || current.type === "video") return;
    timerRef.current = setTimeout(advance, interval);
    return () => clearTimer();
  }, [index, media, advance, interval]);

  // No media — show logo or placeholder
  if (media.length === 0) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-900 ${className}`}>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain opacity-80" />
        ) : (
          <div className="text-gray-600 text-4xl font-bold select-none">ZestPOS</div>
        )}
      </div>
    );
  }

  const safeIndex = index < media.length ? index : 0;
  const current = media[safeIndex];

  return (
    <div key={media.length} className={`relative w-full h-full overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + safeIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {current.type === "video" ? (
            <>
              <video
                src={current.url}
                autoPlay
                muted
                playsInline
                loop
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-lg"
                aria-hidden
              />
              <video
                src={current.url}
                autoPlay
                muted
                playsInline
                loop={media.length === 1}
                className="absolute inset-0 w-full h-full object-contain"
                onEnded={media.length > 1 ? advance : undefined}
              />
            </>
          ) : (
            <>
              <img
                src={current.url}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
              />
              <img
                src={current.url}
                alt="Promo"
                className="absolute inset-0 w-full h-full object-contain"
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {media.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {media.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === safeIndex ? "w-5 bg-blue-400" : "w-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
