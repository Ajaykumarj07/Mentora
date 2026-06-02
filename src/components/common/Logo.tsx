import React from "react";
import { motion } from "motion/react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = "md", showText = true, className = "" }) => {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  const badgeSizes = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-lg",
    lg: "w-14 h-14 text-2xl",
    xl: "w-20 h-20 text-4.5xl",
  };

  return (
    <motion.div 
      className={`flex items-center gap-2.5 ${className} cursor-pointer`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {!showText ? (
        <motion.div
          className={`${badgeSizes[size]} rounded-xl bg-gradient-to-tr from-[#FF5F6D] via-[#EC4899] to-[#A855F7] flex items-center justify-center font-black text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]`}
          animate={{
            boxShadow: [
              "0 0 15px rgba(236,72,153,0.25)",
              "0 0 25px rgba(168,85,247,0.45)",
              "0 0 15px rgba(236,72,153,0.25)",
            ],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
          }}
        >
          M
        </motion.div>
      ) : (
        <h1 className={`${sizes[size]} text-white font-sans font-extrabold tracking-tight select-none flex items-center`}>
          <span className="text-white">Mentora</span>
          <span className="bg-gradient-to-r from-[#FF5F6D] via-[#FFC371] to-[#A855F7] bg-clip-text text-transparent italic ml-1.5 font-black">
            AI
          </span>
        </h1>
      )}
    </motion.div>
  );
};

export default Logo;
