import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { normalizeStateCode, type UsStateCode } from "@/lib/us-state-taxes";

const BILLING_STATE_KEY = "ur_billing_state";

export function useBillingState() {
  const [stateCode, setStateCodeState] = useState<UsStateCode | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(BILLING_STATE_KEY);
        if (!cancelled) {
          setStateCodeState(normalizeStateCode(stored));
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setStateCode = useCallback(async (code: UsStateCode) => {
    setStateCodeState(code);
    try {
      await AsyncStorage.setItem(BILLING_STATE_KEY, code);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  return { stateCode, setStateCode, loaded, hasState: stateCode != null };
}
