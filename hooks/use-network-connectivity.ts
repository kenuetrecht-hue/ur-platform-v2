import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";

export type NetworkConnectivity = {
  /** Browser online flag or last API probe success. */
  isOnline: boolean;
  /** API health endpoint reachable. */
  isApiReachable: boolean;
};

const PROBE_INTERVAL_MS = 8_000;

async function probeApiReachable(): Promise<boolean> {
  const base = getApiBaseUrl();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/api/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Tracks internet + API reachability. Voice/text metering pauses when either drops.
 */
export function useNetworkConnectivity(): NetworkConnectivity {
  const [isOnline, setIsOnline] = useState(() =>
    Platform.OS === "web" && typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [isApiReachable, setIsApiReachable] = useState(true);

  const runProbe = useCallback(async () => {
    const browserOnline =
      Platform.OS === "web" && typeof navigator !== "undefined" ? navigator.onLine : true;
    setIsOnline(browserOnline);
    if (!browserOnline) {
      setIsApiReachable(false);
      return;
    }
    setIsApiReachable(await probeApiReachable());
  }, []);

  useEffect(() => {
    void runProbe();

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const onOnline = () => void runProbe();
      const onOffline = () => {
        setIsOnline(false);
        setIsApiReachable(false);
      };
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }

    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") void runProbe();
    });

    const interval = setInterval(() => void runProbe(), PROBE_INTERVAL_MS);
    return () => {
      appSub.remove();
      clearInterval(interval);
    };
  }, [runProbe]);

  return { isOnline, isApiReachable };
}

export function isMeteringConnected(state: NetworkConnectivity): boolean {
  return state.isOnline && state.isApiReachable;
}
