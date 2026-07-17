import { Capacitor } from "@capacitor/core";

/**
 * Centered API base URL resolver.
 * 
 * - On Web (Vercel): Defaults to relative paths ("") if VITE_API_BASE_URL is not set, 
 *   preserving native same-origin hosting.
 * - On Capacitor Native (Android/iOS): Defaults to "https://mentora-ai-ruby.vercel.app" as 
 *   a reminder placeholder, or dynamically resolves to VITE_API_BASE_URL.
 */
export const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 
  (Capacitor.isNativePlatform() ? "https://mentora-ai-ruby.vercel.app" : "");

if (Capacitor.isNativePlatform() && !API_BASE) {
  console.warn(
    "[API] WARNING: VITE_API_BASE_URL is not set. API calls will fail on native platforms. " +
    "Please specify the API_BASE_URL in your build environment."
  );
}
