import { useState, useEffect } from "react";
import { isNative } from "../lib/platform";

/**
 * useNetwork — React hook for real-time network connectivity status.
 *
 * On native (Capacitor), uses @capacitor/network for reliable detection.
 * On web, uses the browser's navigator.onLine + online/offline events.
 */

let networkPlugin: typeof import("@capacitor/network").Network | null = null;

// Lazily load the Capacitor Network plugin only on native platforms
async function getNetworkPlugin() {
  if (!isNative) return null;
  if (!networkPlugin) {
    const { Network } = await import("@capacitor/network");
    networkPlugin = Network;
  }
  return networkPlugin;
}

export function useNetwork() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<string>("unknown");

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    async function init() {
      const Network = await getNetworkPlugin();

      if (Network) {
        // Native: use Capacitor Network plugin
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);

        const handle = await Network.addListener("networkStatusChange", (status) => {
          setIsOnline(status.connected);
          setConnectionType(status.connectionType);
        });
        listenerHandle = handle;
      } else {
        // Web: use browser events
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        setIsOnline(navigator.onLine);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Return cleanup via closure
        listenerHandle = {
          remove: () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
          },
        };
      }
    }

    init();

    return () => {
      listenerHandle?.remove();
    };
  }, []);

  return { isOnline, connectionType };
}
