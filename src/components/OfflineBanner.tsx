import React from "react";
import { useNetwork } from "../hooks/useNetwork";
import { useAppState } from "../contexts/StateContext";
import { WifiOff } from "lucide-react";

/**
 * OfflineBanner — shows a non-intrusive banner when the device is offline.
 * Only visible when isOnline === false. Disappears automatically when reconnected.
 */
export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetwork();
  const { currentTheme } = useAppState();

  if (isOnline) return null;

  const isLight = currentTheme === "light";
  const isMatrix = currentTheme === "matrix";

  const bannerClasses = isLight
    ? "bg-red-50 border-red-200 text-red-800"
    : isMatrix
    ? "bg-black border-red-500/40 text-red-400 font-mono"
    : "bg-red-500/10 border-red-500/25 text-red-300";

  const iconClasses = isLight
    ? "text-red-500"
    : isMatrix
    ? "text-red-400"
    : "text-red-400";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-center gap-3 px-4 py-2.5 border-b text-xs font-semibold transition-all animate-fade-in ${bannerClasses}`}
    >
      <WifiOff className={`w-3.5 h-3.5 shrink-0 ${iconClasses}`} />
      <span>
        You're offline. AI features are unavailable. Check your connection and try again.
      </span>
    </div>
  );
};
