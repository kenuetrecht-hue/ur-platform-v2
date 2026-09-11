import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, type TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { showUserMessage } from "@/lib/show-user-message";
import { readWebTextInputValue } from "@/lib/read-web-input-value";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { trpc } from "@/lib/trpc";
import { hrefAfterSignIn } from "@/lib/after-sign-in";
import { clearAgeKycDraft } from "@/lib/age-kyc-draft-store";
import { clearAgeKycPassToken, getAgeKycPassToken } from "@/lib/age-kyc-pass-store";
import { ID_MUST_PASS_FIRST } from "@/lib/signup-step-copy";

export function useLoginScreen() {
  const router = useRouter();
  const { login, error: authError, clearError, isAuthenticated } = useAuth();
  const verifyTurnstile = trpc.auth.verifyTurnstile.useMutation();
  const claimPass = trpc.ageKyc.claimPass.useMutation();
  const turnstileConfig = trpc.auth.turnstileConfig.useQuery(undefined, { staleTime: 60_000 });
  const connectivity = trpc.auth.connectivity.useQuery(undefined, { staleTime: 15_000 });
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);

  const displayError = formError ?? authError;
  const onTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const syncAutofill = () => {
      const autofilledEmail = readWebTextInputValue(emailRef, "login-email");
      const autofilledPassword = readWebTextInputValue(passwordRef, "login-password");
      if (autofilledEmail) setEmail(autofilledEmail);
      if (autofilledPassword) setPassword(autofilledPassword);
    };

    syncAutofill();
    const timer = window.setTimeout(syncAutofill, 250);
    const timer2 = window.setTimeout(syncAutofill, 1000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(timer2);
    };
  }, []);

  const handleLogin = useCallback(async () => {
    setFormError(null);
    setStatusLine("Checking credentials…");

    const emailValue = (
      email.trim() || readWebTextInputValue(emailRef, "login-email")
    ).trim();
    const passwordValue = (
      password.trim() || readWebTextInputValue(passwordRef, "login-password")
    ).trim();

    if (!getAgeKycPassToken()) {
      const msg = ID_MUST_PASS_FIRST;
      setFormError(msg);
      setStatusLine(null);
      showUserMessage("Pictures first", msg);
      return;
    }

    if (!emailValue || !passwordValue) {
      const msg = "Please enter email and password.";
      setFormError(msg);
      setStatusLine(null);
      showUserMessage("Error", msg);
      return;
    }

    setEmail(emailValue);
    setPassword(passwordValue);
    setSubmitting(true);
    setStatusLine("Signing in…");

    try {
      if (turnstileConfig.data?.required && !turnstileToken.trim()) {
        throw new Error("Complete the security check before signing in.");
      }
      await verifyTurnstile.mutateAsync({
        token: turnstileToken,
        action: "login",
      });
      await login(emailValue, passwordValue, turnstileToken || undefined);
      const passToken = getAgeKycPassToken();
      let claimed = false;
      if (passToken) {
        try {
          const status = await claimPass.mutateAsync({ passToken });
          claimed = status.verified === true;
          if (claimed) {
            clearAgeKycPassToken();
            clearAgeKycDraft();
          }
        } catch {
          claimed = false;
        }
      }
      setStatusLine(claimed ? "Success — opening the app…" : "Success — opening the ID photo page…");
      router.replace(hrefAfterSignIn(claimed));
    } catch (err) {
      const msg = explainAuthFailure(err);
      setFormError(msg);
      setStatusLine(null);
      showUserMessage("Login Failed", msg);
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login, router, turnstileToken, turnstileConfig.data?.required, verifyTurnstile, claimPass]);

  const onEmailChange = (value: string) => {
    setEmail(value);
    setStatusLine(null);
    if (formError) setFormError(null);
    if (authError) clearError();
  };

  const onPasswordChange = (value: string) => {
    setPassword(value);
    setStatusLine(null);
    if (formError) setFormError(null);
    if (authError) clearError();
  };

  return {
    emailRef,
    passwordRef,
    email,
    password,
    submitting,
    displayError,
    statusLine,
    isAuthenticated,
    handleLogin,
    onEmailChange,
    onPasswordChange,
    onTurnstileToken,
    serviceHint:
      connectivity.data?.supabaseReachable === false ? connectivity.data.hint : null,
  };
}
