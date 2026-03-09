import { createContext, useContext, useState, useCallback,type  ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FlyingItem {
  id: number;
  start: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  end: {
    x: number;
    y: number;
  };
  imageUrl: string;
}

interface AnimationContextType {
  triggerAnimation: (element: HTMLElement, imageUrl: string) => void;
}

const AnimationContext = createContext<AnimationContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error("useAnimation must be used within AnimationProvider");
  }
  return context;
};

// Flying Item Component
const FlyingItem = ({ start, end, imageUrl, onComplete }: {
  start: FlyingItem['start'];
  end: FlyingItem['end'];
  imageUrl: string;
  onComplete: () => void;
}) => {
  return (
    <motion.div
      initial={{
        position: "fixed",
        left: start.x,
        top: start.y,
        width: start.width,
        height: start.height,
        zIndex: 9999,
      }}
      animate={{
        left: end.x,
        top: end.y,
        width: 40,
        height: 40,
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 0.8,
        ease: [0.43, 0.13, 0.23, 0.96],
      }}
      onAnimationComplete={onComplete}
      className="pointer-events-none rounded-lg overflow-hidden shadow-2xl"
    >
      <img
        src={imageUrl}
        alt="Flying product"
        className="w-full h-full object-cover"
      />
    </motion.div>
  );
};


export const AnimationProvider = ({ children }: { children: ReactNode }) => {
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);

  const triggerAnimation = useCallback((element: HTMLElement, imageUrl: string) => {
    const rect = element.getBoundingClientRect();
    const cartButton = document.getElementById("cart-button");
    
    if (!cartButton) return;
    
    const cartRect = cartButton.getBoundingClientRect();
    
    const id = Date.now();
    const animation: FlyingItem = {
      id,
      start: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      },
      end: {
        x: cartRect.left + cartRect.width / 2 - 20,
        y: cartRect.top + cartRect.height / 2 - 20,
      },
      imageUrl,
    };
    
    setFlyingItems((prev) => [...prev, animation]);
  }, []);

  const removeAnimation = useCallback((id: number) => {
    setFlyingItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <AnimationContext.Provider value={{ triggerAnimation }}>
      {children}
      <AnimatePresence>
        {flyingItems.map((item) => (
          <FlyingItem
            key={item.id}
            start={item.start}
            end={item.end}
            imageUrl={item.imageUrl}
            onComplete={() => removeAnimation(item.id)}
          />
        ))}
      </AnimatePresence>
    </AnimationContext.Provider>
  );
};