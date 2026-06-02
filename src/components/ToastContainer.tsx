import React, { useEffect } from "react";
import { useAppState } from "../contexts/StateContext";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  Info, 
  X, 
  Coins, 
  ChevronUp 
} from "lucide-react";

interface ToastProps {
  id: string;
  type: "levelup" | "badge" | "info" | "success";
  title: string;
  message: string;
  duration?: number;
  onClose: () => void;
}

const ToastItem: React.FC<ToastProps> = ({ id, type, title, message, duration = 5000, onClose }) => {
  // Setup auto-dismiss timer
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Determine styles and icons based on toast type
  let bgClass = "bg-slate-900/90 border border-white/10 text-slate-100 shadow-2xl backdrop-blur-xl";
  let iconElement = <Info className="w-5 h-5 text-purple-400" />;
  let accentBar = "bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse";
  let badgeHighlight = null;

  if (type === "levelup") {
    bgClass = "bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/90 border-2 border-amber-500/40 text-white shadow-[0_0_25px_rgba(245,158,11,0.25)] backdrop-blur-xl ring-1 ring-amber-500/20";
    iconElement = (
      <div className="relative">
        <Sparkles className="w-6 h-6 text-amber-400 animate-bounce" />
        <ChevronUp className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-ping" />
      </div>
    );
    accentBar = "bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 h-1.5";
    badgeHighlight = (
      <div className="flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono text-amber-300 w-fit">
        <Coins className="w-3.5 h-3.5 text-amber-400" />
        <span>+15 Cash Bonus Credited!</span>
      </div>
    );
  } else if (type === "badge") {
    bgClass = "bg-gradient-to-b from-slate-950 via-slate-900 to-purple-950/90 border border-purple-500/40 text-white shadow-[0_0_20px_rgba(168,85,247,0.25)] backdrop-blur-xl";
    iconElement = (
      <div className="relative p-1 rounded-lg bg-purple-500/10 border border-purple-400/20">
        <Trophy className="w-6 h-6 text-purple-400" />
      </div>
    );
    accentBar = "bg-gradient-to-r from-purple-500 via-fuchsia-400 to-pink-500 h-1";
    badgeHighlight = (
      <div className="flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] font-mono text-purple-300 w-fit">
        <Award className="w-3.5 h-3.5 text-purple-300" />
        <span>Trophy added to Profile!</span>
      </div>
    );
  } else if (type === "success") {
    bgClass = "bg-slate-900/95 border border-emerald-500/30 text-slate-100 shadow-[0_0_15px_rgba(16,185,129,0.15)] backdrop-blur-xl";
    iconElement = <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    accentBar = "bg-emerald-500 h-1";
  } else if (type === "info") {
    bgClass = "bg-slate-900/95 border border-blue-500/30 text-slate-100 shadow-md backdrop-blur-xl";
    iconElement = <Info className="w-5 h-5 text-blue-400" />;
    accentBar = "bg-blue-500 h-1";
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 15 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      whileHover={{ scale: 1.012 }}
      className={`relative w-full max-w-sm overflow-hidden rounded-2xl ${bgClass}`}
    >
      {/* Top accent bar indicator */}
      <div className={`w-full h-1 ${accentBar}`} />

      <div className="p-4.5 flex gap-3.5 items-start">
        {/* Animated Trophy / Level Sparkle icon */}
        <div className="shrink-0 mt-0.5">
          {iconElement}
        </div>

        {/* Text Area Description */}
        <div className="flex-1 text-left min-w-0">
          <h5 className="font-display font-black text-xs uppercase tracking-wider text-slate-200">
            {title}
          </h5>
          <p className="text-[11px] leading-relaxed text-slate-350 mt-1">
            {message}
          </p>
          {badgeHighlight}
        </div>

        {/* Dismiss Button */}
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppState();

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-[calc(100vw-40px)] sm:w-96 max-h-[90vh] overflow-y-auto pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              id={toast.id}
              type={toast.type}
              title={toast.title}
              message={toast.message}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
