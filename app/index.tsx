import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AFTER_ID_PASS_HREF, RETURNING_LOGIN_HREF } from "@/lib/after-sign-in";
import {
  PASSWORD_RECOVERY_STASH_KEY,
  isPasswordRecoveryHref,
  shouldCapturePasswordRecoveryHref,
} from "@/lib/password-recovery-url";
import { UrBootShell } from "@/components/ur-boot-shell";

/** First door: Login. Already logged in → the app. The ID guard still applies. */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const [clientReady, setClientReady] = useState(false);
  const [recoveryLink, setRecoveryLink] = useState(false);

  useEffect(() => {
    setClientReady(true);
    if (typeof window !== "undefined" && shouldCapturePasswordRecoveryHref(window.location.href)) {
      try {
        window.sessionStorage.setItem(PASSWORD_RECOVERY_STASH_KEY, window.location.href);
      } catch {
        /* the new-password page still explains how to send a fresh email */
      }
      if (isPasswordRecoveryHref(window.location.href) || window.location.hash.includes("access_token=")) {
        setRecoveryLink(true);
      }
    }
  }, []);

  if (!clientReady || isLoading) {
    return <UrBootShell label="Opening UR…" />;
  }

  if (recoveryLink) {
    return <Redirect href="/new-password" />;
  }

  if (isAuthenticated) {
    return <Redirect href={AFTER_ID_PASS_HREF} />;
  }

  return <Redirect href={RETURNING_LOGIN_HREF} />;
}
