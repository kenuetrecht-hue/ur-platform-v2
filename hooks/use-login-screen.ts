import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, type TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { showUserMessage } from "@/lib/show-user-message";
import { readWebTextInputValue } from "@/lib/read-web-input-value";

export function useLoginScreen() {
  const router = useRouter();
  const { login, error: authError, clearError, isAuthenticated } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);

  const displayError = formError ?? authError;

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
      await login(emailValue, passwordValue);
      setStatusLine("Success — opening home…");
      router.replace("/(tabs)");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Sign in failed. Please try again.";
      setFormError(msg);
      setStatusLine(null);
      showUserMessage("Login Failed", msg);
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login, router]);

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
  };
}
