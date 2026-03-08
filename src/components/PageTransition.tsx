import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const desktopVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const mobileVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const desktopTransition = {
  duration: 0.3,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
};

const mobileTransition = {
  duration: 0.22,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

export function PageTransition({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={isMobile ? mobileVariants : desktopVariants}
      transition={isMobile ? mobileTransition : desktopTransition}
    >
      {children}
    </motion.div>
  );
}
