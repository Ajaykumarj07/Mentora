import { Capacitor } from "@capacitor/core";

/**
 * Platform detection utilities for Mentora.
 * Evaluated dynamically at call-time to prevent race conditions during native bridge injection.
 */

/** True when running inside Capacitor native shell (Android/iOS) */
export const getIsNative = (): boolean => Capacitor.isNativePlatform();

/** True when running on Android specifically */
export const getIsAndroid = (): boolean => {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  const hasCapacitor = typeof window !== "undefined" && !!(window as any).Capacitor;
  return platform === "android" || (isNative && /android/i.test(navigator.userAgent)) || (/android/i.test(navigator.userAgent) && hasCapacitor);
};

/** True when running on iOS specifically */
export const getIsIOS = (): boolean => {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  const hasCapacitor = typeof window !== "undefined" && !!(window as any).Capacitor;
  return platform === "ios" || (isNative && /iphone|ipad|ipod/i.test(navigator.userAgent)) || (/iphone|ipad|ipod/i.test(navigator.userAgent) && hasCapacitor);
};

/** True when running in a standard web browser */
export const getIsWeb = (): boolean => !getIsNative();

// Keep backward compatible static bindings for simple layout checks, but recommend getters for critical logic
export const isNative = Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === "android";
export const isIOS = Capacitor.getPlatform() === "ios";
export const isWeb = !isNative;
export const platform = Capacitor.getPlatform();

