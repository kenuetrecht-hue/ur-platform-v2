import { useCallback, useEffect, useRef, useState } from "react";
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
import { AFTER_ID_PASS_HREF, shouldEnterAppAfterMemberSignIn } from "@/lib/after-sign-in";
import { getAgeKycPassToken, hasAgeKycPassToken } from "@/lib/age-kyc-pass-store";
import { ID_MUST_PASS_FIRST, signupPrivacyBlock } from "@/lib/signup-step-copy";
import { TERMS_SIGNUP_ACKNOWLEDGMENT } from "@/lib/platform-terms-of-use";
import { showUserMessage } from "@/lib/show-user-message";
import { TapToRead } from "@/components/tap-to-read";
import {
  clearJoinAccountDraft,
  loadJoinAccountDraft,
  saveJoinAccountDraft,
} from "@/lib/join-account-draft";
import { getStayLoggedIn, setStayLoggedIn } from "@/lib/stay-logged-in";
import { isAlreadyRegisteredAuthError } from "@/lib/auth-already-registered";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One page: name / email / password first, then pictures, then automatic sign-in. */
export function FinishAccountAfterIdPass() {
  const colors = useColors();
  const router = useRouter();
  const { login, register, isAuthenticated } = useAuth();
  const claimPass = trpc.ageKyc.claimPass.useMutation();
  const kycUtils = trpc.useUtils();
  const verifyTurnstile = trpc.auth.verifyTurnstile.useMutation();
  const turnstileConfig = trpc.auth.turnstileConfig.useQuery(undefined, { staleTime: 60_000 });
  const saved = loadJoinAccountDraft();
  const [name, setName] = useState(saved.name);
  const [email, setEmail] = useState(saved.email);
  const [password, setPassword] = useState(saved.password);
  const [acceptedTerms, setAcceptedTerms] = useState(saved.acceptedTerms);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picturesPassed, setPicturesPassed] = useState(() => hasAgeKycPassToken());
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedInBox] = useState(() => getStayLoggedIn());
  const enteredRef = useRef(false);
  const pendingEnterRef = useRef(false);
  const inFlightRef = useRef(false);
  const autoKeyRef = useRef("");
  const draftRef = useRef({ name, email, password, acceptedTerms, turnstileToken, stayLoggedIn });
  draftRef.current = { name, email, password, acceptedTerms, turnstileToken, stayLoggedIn };

  useEffect(() => {
    saveJoinAccountDraft({ name, email, password, acceptedTerms });
  }, [name, email, password, acceptedTerms]);

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
    setStatus("Pictures passed — logging you in…");
    router.replace(AFTER_ID_PASS_HREF);
  }, [router]);

  const enterAfterPictures = useCallback(async () => {
    if (enteredRef.current || inFlightRef.current) return;
    const draft = draftRef.current;
    const emailValue = draft.email.trim();
    const passwordValue = draft.password.trim();
    const nameValue = draft.name.trim();

    if (!emailValue || !passwordValue) {
      setError("Pictures passed. Type your email and password above. We will log you in automatically.");
      return;
    }
    if (!getAgeKycPassToken()) {
      setError("Take the three pictures and tap Check my three pictures.");
      return;
    }

    inFlightRef.current = true;
    setStayLoggedIn(draftRef.current.stayLoggedIn);
    setBusy(true);
    setError(null);
    setStatus("Pictures passed — logging you in…");

    try {
      if (turnstileConfig.data?.required && !draft.turnstileToken.trim()) {
        throw new Error("Complete the security check, then we will log you in.");
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

      let signedIn = false;
      try {
        await login(emailValue, passwordValue, draft.turnstileToken || undefined);
        signedIn = true;
      } catch (loginErr) {
        if (isAuthenticated) {
          signedIn = true;
        } else if (isAlreadyRegisteredAuthError(loginErr)) {
          setError("That email is already on UR. Keep your password filled in — we are logging you in.");
        }
        if (!signedIn) {
          if (!nameValue) {
            setError("Pictures passed. Type your name above so we can create the account and log you in.");
            return;
          }
          if (!draft.acceptedTerms) {
            setError("Pictures passed. Check the box that you agree to the Terms. We will log you in after that.");
            return;
          }
          try {
            const result = await register(
              emailValue,
              passwordValue,
              nameValue,
              "creator",
              draft.turnstileToken || undefined,
            );
            if (result.needsEmailConfirmation) {
              setError(
                "Account created. Open the confirmation email, then type your email and password here. We will log you in.",
              );
              setStatus(null);
              return;
            }
            signedIn = true;
          } catch (registerErr) {
            if (!isAlreadyRegisteredAuthError(registerErr)) {
              throw registerErr;
            }
            setStatus("That email is already on UR. Logging you in…");
            await login(emailValue, passwordValue, draft.turnstileToken || undefined);
            signedIn = true;
          }
        }
        if (!signedIn) throw loginErr;
      }

      pendingEnterRef.current = true;
      const claimed = await claimWithRetry();
      let accountAlreadyVerified = claimed;
      if (!accountAlreadyVerified) {
        try {
          const status = await kycUtils.ageKyc.getStatus.fetch();
          accountAlreadyVerified = status?.verified === true;
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
      setError("Pictures passed. We could not attach them to this account yet. Tap Check my three pictures again, then we will log you in.");
      setStatus(null);
      return;
    } catch (err) {
      const msg = explainAuthFailure(err);
      if (msg.toLowerCase().includes("sign in with your email")) {
        setError("Pictures passed. Keep your email and password filled in — we are logging you in.");
        return;
      }
      setError(msg);
      setStatus(null);
      showUserMessage("Login", msg);
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }, [claimWithRetry, enterApp, isAuthenticated, kycUtils, login, register, turnstileConfig.data?.required, verifyTurnstile]);

  useEffect(() => {
    if (!pendingEnterRef.current || !isAuthenticated || enteredRef.current) return;
    void (async () => {
      const claimed = await claimWithRetry();
      let accountAlreadyVerified = claimed;
      if (!accountAlreadyVerified) {
        try {
          const status = await kycUtils.ageKyc.getStatus.fetch();
          accountAlreadyVerified = status?.verified === true;
        } catch {
          /* retry path */
        }
      }
      if (shouldEnterAppAfterMemberSignIn({ claimedOnAccount: claimed, accountAlreadyVerified })) {
        enterApp();
        return;
      }
      pendingEnterRef.current = false;
      setError("Pictures passed. We could not attach them to this account yet. Tap Check my three pictures again, then we will log you in.");
      setStatus(null);
    })();
  }, [claimWithRetry, enterApp, isAuthenticated, kycUtils]);

  const onIdPassed = useCallback(() => {
    setPicturesPassed(true);
    setError(null);
    void enterAfterPictures();
  }, [enterAfterPictures]);
  const onIdReset = useCallback(() => setPicturesPassed(false), []);

  useEffect(() => {
    if (!picturesPassed || busy || enteredRef.current) return;
    if (!email.trim() || !password.trim()) return;
    const key = `${email.trim()}|${password}|${name.trim()}|${acceptedTerms ? "1" : "0"}`;
    if (autoKeyRef.current === key) return;
    autoKeyRef.current = key;
    void enterAfterPictures();
  }, [acceptedTerms, busy, email, enterAfterPictures, name, password, picturesPassed]);

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

  return (
    <View style={{ gap: 12, width: "100%" }} testID="finish-account-after-id-pass">
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
        1. Name, email, and password
      </Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
        Fill these in first. After the pictures pass, we log you in automatically.
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
        autoComplete="username"
        textContentType="username"
        autoCorrect={false}
        editable={!busy}
        nativeID="login-email"
        style={inputStyle}
        testID="login-email"
      />

      <Text style={{ color: colors.foreground, fontWeight: "600" }}>Password</Text>
      <View>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.muted}
          secureTextEntry={!showPassword}
          autoComplete="current-password"
          textContentType="password"
          editable={!busy}
          nativeID="login-password"
          style={inputStyle}
          testID="login-password"
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
      <Pressable
        onPress={() => {
          setStayLoggedInBox((value) => {
            const next = !value;
            setStayLoggedIn(next);
            return next;
          });
        }}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 }}
        testID="stay-logged-in"
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: stayLoggedIn ? colors.primary : colors.border,
            backgroundColor: stayLoggedIn ? colors.primary : "transparent",
            marginTop: 2,
          }}
        />
        <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20, flex: 1 }}>
          Stay logged in. Next time you open the app, you will already be signed in.
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
          Pictures passed. Logging you in with the email and password above…
        </Text>
      ) : null}

      {error ? (
        <Text style={{ color: "#c0392b", fontSize: 14, lineHeight: 20 }}>{error}</Text>
      ) : null}
      {status && !error ? (
        <Text style={{ color: colors.primary, fontWeight: "700" }}>{status}</Text>
      ) : null}

      <PrimaryActionButton
        label="Login now"
        loadingLabel="Logging you in…"
        loading={busy}
        onPress={() => void enterAfterPictures()}
        backgroundColor={colors.primary}
        testID="finish-account-create"
      />
    </View>
  );
}
