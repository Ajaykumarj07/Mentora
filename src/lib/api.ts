import { Capacitor } from "@capacitor/core";

/**
 * Centered API base URL resolver.
 * 
 * - Defaults to "https://mentora-28ij.onrender.com" if VITE_API_BASE_URL is not set.
 * - This applies to both Web and Capacitor Native platforms, ensuring all API traffic
 *   routes to the centralized Render backend.
 */
export const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "https://mentora-28ij.onrender.com";

if (!API_BASE) {
  console.warn(
    "[API] WARNING: API_BASE is missing. API calls will fail."
  );
}
