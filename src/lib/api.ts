import { Capacitor } from "@capacitor/core";

/**
 * Centered API base URL resolver.
 * 
 * - Defaults to "https://mentora-28ij.onrender.com" if VITE_API_BASE_URL is not set.
 * - This applies to both Web and Capacitor Native platforms, ensuring all API traffic
 *   routes to the centralized Render backend.
 */
// Statically referenced to ensure Vite replaces it during build
const envBase = import.meta.env.VITE_API_BASE_URL;
const isValidUrl = typeof envBase === "string" && (envBase.startsWith("http://") || envBase.startsWith("https://"));

export const API_BASE = isValidUrl ? envBase : "https://mentora-28ij.onrender.com";

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

if (!API_BASE) {
  console.warn(
    "[API] WARNING: API_BASE is missing. API calls will fail."
  );
}
