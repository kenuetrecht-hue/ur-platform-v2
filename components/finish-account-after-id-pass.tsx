import { useCallback, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { IdCheckDuringSignin } from "@/components/id-check-during-signin";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { claimStoredAgeKycPass } from "@/lib/claim-stored-age-kyc-pass";
import { AFTER_ID_PASS_HREF } from "@/lib/after-sign-in";
import { getAgeKycPassToken, hasAgeKycPassToken } from "@/lib/age-kyc-pass-store";
import { ID_MUST_PASS_FIRST, signupPrivacyBlock } from "@/lib/signup-step-copy";
import { TERMS_SIGNUP_ACKNOWLEDGMENT } from "@/lib/platform-terms-of-use";
import { showUserMessage } from "@/lib/show-user-message";
import { TapToRead } from "@/components/tap-to-read";

/** One page: name / email / password first, then the three pictures, then enter. */
export function FinishAccountAfterIdPass() {
  const colors = useColors();
  const router = useRouter();
  const { login, register } = useAuth();
  const claimPass = trpc.ageKyc.claimPass.useMutation();
  const verifyTurnstile = trpc.auth.verifyTurnstile.useMutation();
  const turnstileConfig = trpc.auth.turnstileConfig.useQuery(undefined, { staleTime: 60_000 });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picturesPassed, setPicturesPassed] = useState(() => hasAgeKycPassToken());
  const [showPassword, setShowPassword] = useState(false);

  const onIdPassed = useCallback(() => {
    setPicturesPassed(true);
    setError(null);
  }, []);
  const onIdReset = useCallback(() => setPicturesPassed(false), []);

  const inputStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.foreground,
    width: "100%" as const,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  };

  const requirePictures = (): boolean => {
    if (picturesPassed && getAgeKycPassToken()) return true;
    const msg = "Type your name, email, and password first. Then take the three pictures and tap Check my three pictures.";
    setError(msg);
    showUserMessage("Pictures next", msg);
    return false;
  };

  const enterApp = () => {
    setStatus("Success — opening the app…");
    router.replace(AFTER_ID_PASS_HREF);
  };

  const onSignIn = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Type your email and password first, then take the pictures.");
      return;
    }
    if (!requirePictures()) return;
    setBusy(true);
    setStatus("Signing in…");
    try {
      if (turnstileConfig.data?.required && !turnstileToken.trim()) {
        throw new Error("Complete the security check before signing in.");
      }
      await verifyTurnstile.mutateAsync({ token: turnstileToken, action: "login" });
      await login(email.trim(), password.trim(), turnstileToken || undefined);
      const claimed = await claimStoredAgeKycPass((input) => claimPass.mutateAsync(input));
      if (claimed) {
        enterApp();
        return;
      }
      setError("Signed in, but the pictures still need to attach. Tap Check my three pictures, then Sign in again.");
    } catch (err) {
      const msg = explainAuthFailure(err);
      setError(msg);
      setStatus(null);
      showUserMessage("Sign in", msg);
    } finally {
      setBusy(false);
    }
  };

  const onCreateAccount = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Type your name, email, and password first, then take the pictures.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!acceptedTerms) {
      setError("Check the box to agree to the Terms of Use.");
      return;
    }
    if (!requirePictures()) return;
    setBusy(true);
    setStatus("Creating account…");
    try {
      if (turnstileConfig.data?.required && !turnstileToken.trim()) {
        throw new Error("Complete the security check before creating an account.");
      }
      await verifyTurnstile.mutateAsync({
        token: turnstileToken,
        action: "signup",
        email: email.trim(),
        displayName: name.trim(),
      });
      const result = await register(
        email.trim(),
        password.trim(),
        name.trim(),
        "creator",
        turnstileToken || undefined,
      );
      if (result.needsEmailConfirmation) {
        const msg =
          "Account created. Open the confirmation email, then type your email and password here and tap Sign in.";
        setError(msg);
        setStatus(null);
        showUserMessage("Confirm your email", msg);
        return;
      }
      const claimed = await claimStoredAgeKycPass((input) => claimPass.mutateAsync(input));
      if (claimed) {
        enterApp();
        return;
      }
      setError("Account created. Tap Check my three pictures if needed, then tap Sign in.");
    } catch (err) {
      const msg = explainAuthFailure(err);
      setError(msg);
      setStatus(null);
      showUserMessage("Create account", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 12, width: "100%" }} testID="finish-account-after-id-pass">
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
        1. Name, email, and password
      </Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
        Fill these in first. Then scroll down for the pictures.
      </Text>

      <Text style={{ color: colors.foreground, fontWeight: "600" }}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.muted}
        autoCapitalize="words"
        editable={!busy}
        style={inputStyle}
        testID="finish-account-name"
      />

      <Text style={{ color: colors.foreground, fontWeight: "600" }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!busy}
        style={inputStyle}
        testID="finish-account-email"
      />

      <Text style={{ color: colors.foreground, fontWeight: "600" }}>Password</Text>
      <View style={{ position: "relative" }}>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.muted}
          secureTextEntry={!showPassword}
          autoComplete="password"
          editable={!busy}
          style={inputStyle}
          testID="finish-account-password"
        />
        <Pressable onPress={() => setShowPassword((value) => !value)} style={{ marginTop: 8 }}>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
            {showPassword ? "Hide password" : "Show password"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => setAcceptedTerms((value) => !value)}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: acceptedTerms ? colors.primary : colors.border,
            backgroundColor: acceptedTerms ? colors.primary : "transparent",
            marginTop: 2,
          }}
        />
        <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20, flex: 1 }}>
          I am 18 or older and I agree to the{" "}
          <Link href="/terms" style={{ color: colors.primary, fontWeight: "700" }}>
            Terms
          </Link>
          .
        </Text>
      </Pressable>
      <TapToRead title="Why we ask and what we keep" testID="join-why-tab">
        {ID_MUST_PASS_FIRST}
        {"\n\n"}
        {TERMS_SIGNUP_ACKNOWLEDGMENT}
        {"\n\n"}
        {signupPrivacyBlock()}
      </TapToRead>

      <TurnstileWidget action="signup" onToken={setTurnstileToken} />

      <View style={{ height: 8 }} />
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
        2. Then take the three pictures
      </Text>
      <IdCheckDuringSignin onPassed={onIdPassed} onReset={onIdReset} />

      {picturesPassed ? (
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 15 }}>
          Pictures passed. Tap Create account or Sign in to enter.
        </Text>
      ) : null}

      {error ? (
        <Text style={{ color: "#c0392b", fontSize: 14, lineHeight: 20 }}>{error}</Text>
      ) : null}
      {status && !error ? (
        <Text style={{ color: colors.primary, fontWeight: "700" }}>{status}</Text>
      ) : null}

      <PrimaryActionButton
        label="Create account and enter"
        loadingLabel="Creating account…"
        loading={busy}
        onPress={() => void onCreateAccount()}
        backgroundColor={colors.primary}
        testID="finish-account-create"
      />
      <PrimaryActionButton
        label="I already have an account — Sign in and enter"
        loadingLabel="Signing in…"
        loading={busy}
        onPress={() => void onSignIn()}
        backgroundColor="#0f172a"
        testID="finish-account-signin"
      />
    </View>
  );
}
