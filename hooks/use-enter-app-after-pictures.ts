import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { getSupabaseClientAsync } from "@/lib/supabase";
import { persistJoinPassword } from "@/lib/persist-join-password";
import { trpc } from "@/lib/trpc";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { claimStoredAgeKycPass } from "@/lib/claim-stored-age-kyc-pass";
import { AFTER_JOIN_WELCOME_HREF, shouldEnterAppAfterMemberSignIn } from "@/lib/after-sign-in";
import { markGiveJoinEmanual } from "@/lib/join-emanual-handoff";
import { getAgeKycPassToken } from "@/lib/age-kyc-pass-store";
import { clearJoinAccountDraft, loadJoinAccountDraft } from "@/lib/join-account-draft";
import { getStayLoggedIn, setStayLoggedIn } from "@/lib/stay-logged-in";
import { isAlreadyRegisteredAuthError } from "@/lib/auth-already-registered";
import { isInvalidLoginAuthError } from "@/lib/auth-invalid-login";
import { EXISTING_ACCOUNT_AFTER_PICTURES } from "@/lib/existing-join-login";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** After the three pictures pass: register first when needed, then stay logged in. */
export function useEnterAppAfterPictures() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const claimPass = trpc.ageKyc.claimPass.useMutation();
  const kycUtils = trpc.useUtils();
  const verifyTurnstile = trpc.auth.verifyTurnstile.useMutation();
  const turnstileConfig = trpc.auth.turnstileConfig.useQuery(undefined, { staleTime: 60_000 });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const enteredRef = useRef(false);
  const pendingEnterRef = useRef(false);
  const inFlightRef = useRef(false);
  const hardStopRef = useRef(false);

  const claimWithRetry = useCallback(async (): Promise<boolean> => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        if (await claimStoredAgeKycPass((input) => claimPass.mutateAsync(input))) {
          await kycUtils.ageKyc.getStatus.invalidate();
          return true;
        }
      } catch {
        /* token may not be on the next request yet */
      }
      await wait(350);
    }
    return false;
  }, [claimPass, kycUtils]);

  const enterApp = useCallback(() => {
    enteredRef.current = true;
    clearJoinAccountDraft();
    markGiveJoinEmanual();
    setStatus("Pictures passed — logging you in…");
    router.replace(AFTER_JOIN_WELCOME_HREF);
  }, [router]);

  const enterAfterPictures = useCallback(async () => {
    if (enteredRef.current || inFlightRef.current || hardStopRef.current) return;
    const draft = loadJoinAccountDraft();
    const emailValue = draft.email.trim();
    const passwordValue = draft.password.trim();
    const nameValue = draft.name.trim();

    if (!emailValue || !passwordValue) {
      setError("Pictures passed. Type your email and password on Sign up. We will log you in automatically.");
      return;
    }
    if (!getAgeKycPassToken()) {
      setError("Take the three pictures and tap Check my ID and selfie.");
      return;
    }

    inFlightRef.current = true;
    setStayLoggedIn(getStayLoggedIn());
    setBusy(true);
    setError(null);
    setStatus("Pictures passed — logging you in…");

    try {
      if (turnstileConfig.data?.required && !draft.turnstileToken.trim()) {
        throw new Error("Complete the security check on Sign up, then we will log you in.");
      }

      if (draft.turnstileToken.trim()) {
        try {
          await verifyTurnstile.mutateAsync({
            token: draft.turnstileToken,
            action: "signup",
            email: emailValue,
            displayName: nameValue || undefined,
          });
        } catch {
          /* Token may already have been used. Sign-in can still open the app. */
        }
      }

      if (!nameValue || !draft.acceptedTerms) {
        if (!nameValue) {
          setError("Pictures passed. Type your name on Sign up so we can create the account and log you in.");
          return;
        }
        setError("Pictures passed. Tap OK on the Terms on Sign up. We will log you in after that.");
        return;
      }

      const supabase = await getSupabaseClientAsync();
      const saved = await persistJoinPassword({
        supabase,
        email: emailValue,
        password: passwordValue,
        name: nameValue,
      });
      if (saved.status === "needs_confirm") {
        setError(
          "Account created. Open the confirmation email, then type this same email and password on Login.",
        );
        setStatus(null);
        return;
      }
      if (saved.status === "wrong_password") {
        hardStopRef.current = true;
        setError(EXISTING_ACCOUNT_AFTER_PICTURES);
        setStatus(null);
        return;
      }

      try {
        await login(emailValue, passwordValue);
      } catch (loginErr) {
        if (isInvalidLoginAuthError(loginErr) || isAlreadyRegisteredAuthError(loginErr)) {
          hardStopRef.current = true;
          setError(EXISTING_ACCOUNT_AFTER_PICTURES);
          setStatus(null);
          return;
        }
        throw loginErr;
      }

      pendingEnterRef.current = true;
      const claimed = await claimWithRetry();
      let accountAlreadyVerified = claimed;
      if (!accountAlreadyVerified) {
        try {
          const statusResult = await kycUtils.ageKyc.getStatus.fetch();
          accountAlreadyVerified = statusResult?.verified === true;
        } catch {
          /* phone fetch may still be catching up */
        }
      }
      if (shouldEnterAppAfterMemberSignIn({ claimedOnAccount: claimed, accountAlreadyVerified })) {
        enterApp();
        return;
      }
      if (!isAuthenticated) {
        setStatus("Pictures passed — logging you in…");
        return;
      }
      pendingEnterRef.current = false;
      setError("Pictures passed. We could not attach them to this account yet. Tap Check my ID and selfie again, then we will log you in.");
      setStatus(null);
    } catch (err) {
      const msg = explainAuthFailure(err);
      if (isInvalidLoginAuthError(err) || isAlreadyRegisteredAuthError(err)) {
        hardStopRef.current = true;
        setError(EXISTING_ACCOUNT_AFTER_PICTURES);
        setStatus(null);
        return;
      }
      if (msg.toLowerCase().includes("sign in with your email")) {
        setError("Pictures passed. Keep your email and password filled in — we are logging you in.");
        return;
      }
      setError(msg);
      setStatus(null);
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }, [claimWithRetry, enterApp, isAuthenticated, kycUtils, login, turnstileConfig.data?.required, verifyTurnstile]);

  useEffect(() => {
    if (!pendingEnterRef.current || !isAuthenticated || enteredRef.current) return;
    void (async () => {
      const claimed = await claimWithRetry();
      let accountAlreadyVerified = claimed;
      if (!accountAlreadyVerified) {
        try {
          const statusResult = await kycUtils.ageKyc.getStatus.fetch();
          accountAlreadyVerified = statusResult?.verified === true;
        } catch {
          /* retry path */
        }
      }
      if (shouldEnterAppAfterMemberSignIn({ claimedOnAccount: claimed, accountAlreadyVerified })) {
        enterApp();
        return;
      }
      pendingEnterRef.current = false;
      setError("Pictures passed. We could not attach them to this account yet. Tap Check my ID and selfie again, then we will log you in.");
      setStatus(null);
    })();
  }, [claimWithRetry, enterApp, isAuthenticated, kycUtils]);

  return {
    busy,
    error,
    status,
    setError,
    enterAfterPictures,
    verifyTurnstile,
    turnstileConfig,
  };
}
