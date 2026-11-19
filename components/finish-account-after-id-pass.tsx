import { useEffect, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { AFTER_ID_PASS_HREF } from "@/lib/after-sign-in";
import { ID_MUST_PASS_FIRST, signupPrivacyBlock } from "@/lib/signup-step-copy";
import { AGE_OVER_18_CHECKBOX_LABEL, TERMS_SIGNUP_ACKNOWLEDGMENT } from "@/lib/platform-terms-of-use";
import { TapToRead } from "@/components/tap-to-read";
import {
  canContinueToIdPictures,
  loadJoinAccountDraft,
  saveJoinAccountDraft,
} from "@/lib/join-account-draft";
import { getStayLoggedIn, setStayLoggedIn } from "@/lib/stay-logged-in";
import { getSupabaseClientAsync } from "@/lib/supabase";
import { persistJoinPassword } from "@/lib/persist-join-password";
import { EXISTING_ACCOUNT_LOGIN_HINT } from "@/lib/existing-join-login";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { readWebTextInputValue } from "@/lib/read-web-input-value";

/** Sign up page 1: name, email, password, terms. No cameras. */
export function FinishAccountAfterIdPass() {
  const colors = useColors();
  const router = useRouter();
  const saved = loadJoinAccountDraft();
  const [name, setName] = useState(saved.name);
  const [email, setEmail] = useState(saved.email);
  const [password, setPassword] = useState(saved.password);
  const [confirmPassword, setConfirmPassword] = useState(saved.confirmPassword);
  const [acceptedTerms, setAcceptedTerms] = useState(saved.acceptedTerms);
  const [confirmedAdult, setConfirmedAdult] = useState(saved.confirmedAdult);
  const [turnstileToken, setTurnstileToken] = useState(saved.turnstileToken);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stayLoggedIn, setStayLoggedInBox] = useState(() => getStayLoggedIn());

  useEffect(() => {
    saveJoinAccountDraft({
      name,
      email,
      password,
      confirmPassword,
      acceptedTerms,
      confirmedAdult,
      turnstileToken,
    });
  }, [name, email, password, confirmPassword, acceptedTerms, confirmedAdult, turnstileToken]);

  const onContinueToId = () => {
    const emptyRef = { current: null };
    const emailValue = (email.trim() || readWebTextInputValue(emptyRef, "login-email")).trim();
    const passwordValue = (
      password.trim() || readWebTextInputValue(emptyRef, "login-password")
    ).trim();
    const confirmValue = confirmPassword.trim() || passwordValue;
    const draft = {
      name: name.trim(),
      email: emailValue,
      password: passwordValue,
      confirmPassword: confirmValue,
      acceptedTerms,
      confirmedAdult,
      turnstileToken,
    };
    saveJoinAccountDraft(draft);
    if (!canContinueToIdPictures(draft)) {
      if (!draft.name || !draft.email || !draft.password) {
        setError("Type your name, email, and password first.");
        return;
      }
      if (draft.password.length < 6) {
        setError("Password needs at least 6 characters.");
        return;
      }
      if (draft.password !== draft.confirmPassword) {
        setError("The two password lines must match.");
        return;
      }
      if (!draft.acceptedTerms) {
        setError("Read the Terms, then tap OK.");
        return;
      }
      setError("Check the box that says you are over the age of 18.");
      return;
    }
    setError(null);
    setBusy(true);
    void (async () => {
      try {
        const supabase = await getSupabaseClientAsync();
        const saved = await persistJoinPassword({
          supabase,
          email: draft.email,
          password: draft.password,
          name: draft.name,
        });
        if (saved.status === "wrong_password") {
          setError(EXISTING_ACCOUNT_LOGIN_HINT);
          return;
        }
        if (saved.status === "needs_confirm") {
          setError("Open the email we sent, confirm it, then use Login. No ID photo and no selfie.");
          return;
        }
        router.replace(AFTER_ID_PASS_HREF);
      } catch (err) {
        setError(explainAuthFailure(err));
      } finally {
        setBusy(false);
      }
    })();
  };

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
        Name, email, and password
      </Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
        Type your name, email, and password. Check the box before Sign up. No ID photo and no selfie.
      </Text>
      <Pressable
        onPress={() => setConfirmedAdult((value) => !value)}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 }}
        testID="confirm-over-18"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmedAdult }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: confirmedAdult ? colors.primary : colors.border,
            backgroundColor: confirmedAdult ? colors.primary : "transparent",
            marginTop: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {confirmedAdult ? (
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>✓</Text>
          ) : null}
        </View>
        <Text style={{ color: colors.foreground, fontSize: 16, lineHeight: 22, fontWeight: "800", flex: 1 }}>
          {AGE_OVER_18_CHECKBOX_LABEL}
        </Text>
      </Pressable>

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
        nativeID="login-email"
        editable={!busy}
        style={inputStyle}
        testID="login-email"
      />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.foreground, fontWeight: "600" }}>Password</Text>
        <Pressable
          onPress={() => setShowPassword((value) => !value)}
          hitSlop={10}
          testID="show-password"
          accessibilityRole="button"
          style={{ paddingVertical: 6, paddingHorizontal: 8 }}
        >
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 14 }}>
            {showPassword ? "Hide password" : "Show password"}
          </Text>
        </Pressable>
      </View>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        placeholderTextColor={colors.muted}
        secureTextEntry={!showPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        nativeID="login-password"
        editable={!busy}
        style={inputStyle}
        testID="login-password"
      />
      <Text style={{ color: colors.foreground, fontWeight: "600" }}>Type the password again</Text>
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Same password as above"
        placeholderTextColor={colors.muted}
        secureTextEntry={!showPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!busy}
        style={inputStyle}
        testID="confirm-password"
      />

      <TapToRead title="Read the Terms, rules, and regulations" testID="join-terms-tab">
        {TERMS_SIGNUP_ACKNOWLEDGMENT}
      </TapToRead>
      <PrimaryActionButton
        label={acceptedTerms ? "OK — Terms accepted" : "OK — I agree to the Terms"}
        onPress={() => setAcceptedTerms(true)}
        backgroundColor={acceptedTerms ? "#2f6f4e" : colors.primary}
        testID="accept-terms-ok"
      />
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
        {acceptedTerms
          ? "You pressed OK. Tap Sign up to enter."
          : "Read the Terms, then tap OK on this page. You do not leave this page."}
      </Text>
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
        {signupPrivacyBlock()}
      </TapToRead>

      <TurnstileWidget action="signup" onToken={setTurnstileToken} />

      {error ? (
        <Text style={{ color: "#c0392b", fontSize: 14, lineHeight: 20 }}>{error}</Text>
      ) : null}

      <PrimaryActionButton
        label="Sign up"
        loadingLabel="Saving your email and password…"
        loading={busy}
        onPress={onContinueToId}
        backgroundColor={colors.primary}
        testID="finish-account-create"
      />
    </View>
  );
}
