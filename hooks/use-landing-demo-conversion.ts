import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import {
  clearLandingDemoAttributionId,
  getLandingDemoAttributionId,
} from "@/lib/landing-demo-attribution-storage";

/**
 * After signup/login, link a prior landing demo session to the new account (once).
 */
export function useLandingDemoConversion() {
  const { isAuthenticated, user } = useAuth();
  const attempted = useRef(false);
  const recordConversion = trpc.landing.recordDemoConversion.useMutation({
    onSuccess: () => {
      void clearLandingDemoAttributionId();
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !user?.id || attempted.current) return;

    void (async () => {
      const attributionId = await getLandingDemoAttributionId();
      if (!attributionId) return;
      attempted.current = true;
      recordConversion.mutate({ attributionId });
    })();
  }, [isAuthenticated, user?.id, recordConversion.mutate]);
}
