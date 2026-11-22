import { useEffect, useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { AFTER_ID_PASS_HREF } from "@/lib/after-sign-in";
import { AGE_OVER_18_CHECKBOX_LABEL, CONDUCT_RULES_VERSION } from "@/lib/platform-terms-of-use";
import { rememberJoinRulesAgreement } from "@/lib/join-rules-agreement";
import { trpc } from "@/lib/trpc";
import { AgreeAndReadRow } from "@/components/agree-and-read-row";
import {
  canContinueToIdPictures,
  loadJoinAccountDraft,
  saveJoinAccountDraft,
} from "@/lib/join-account-draft";
import { setStayLoggedIn } from "@/lib/stay-logged-in";
import { getSupabaseClientAsync } from "@/lib/supabase";
import { persistJoinPassword } from "@/lib/persist-join-password";
import { EXISTING_ACCOUNT_LOGIN_HINT } from "@/lib/existing-join-login";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { readWebTextInputValue } from "@/lib/read-web-input-value";

function nameFromEmail(email: string): string {
  const local = email.split("@")[0]?.replace(/[._+-]+/g, " ").trim();
  return (local || "Member").slice(0, 40);
}

const ONE_AGREEMENT_LABEL = `I agree to the Terms of Use, rules, and regulations. ${AGE_OVER_18_CHECKBOX_LABEL}`;

/** Fast join: one password box, then a second box after Submit to verify it. */
export function FinishAccountAfterIdPass() {
  const colors = useColors();
  const router = useRouter();
  const saved = loadJoinAccountDraft();
  const [email, setEmail] = useState(saved.email);
  const [password, setPassword] = useState(saved.password);
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [agreed, setAgreed] = useState(saved.confirmedAdult && saved.acceptedTerms);
  const [turnstileToken, setTurnstileToken] = useState(saved.turnstileToken);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const acceptRules = trpc.conduct.accept.useMutation();

  useEffect(() => {
    setStayLoggedIn(true);
  }, []);

  useEffect(() => {
    saveJoinAccountDraft({
      name: nameFromEmail(email),
      email,
      password,
      confirmPassword: password,
      acceptedTerms: agreed,
      confirmedAdult: agreed,
      turnstileToken,
    });
  }, [email, password, agreed, turnstileToken]);

  const onContinueToId = () => {
    const emptyRef = { current: null };
    const emailValue = (email.trim() || readWebTextInputValue(emptyRef, "login-email")).trim();
    const passwordValue = (
      password.trim() || readWebTextInputValue(emptyRef, "login-password")
    ).trim();
    const typedVerify = (
      verifyPassword.trim() || readWebTextInputValue(emptyRef, "verify-password")
    ).trim();
    if (!verifying) {
      if (!emailValue || !passwordValue) {
        setError("Type your email and password, then tap Submit.");
        return;
      }
      if (passwordValue.length < 6) {
        setError("Password needs at least 6 characters.");
        return;
      }
      if (!agreed) {
        setError("Check the box: I agree to the Terms of Use, rules, and regulations.");
        return;
      }
      rememberJoinRulesAgreement();
      setPassword(passwordValue);
      setEmail(emailValue);
      setVerifyPassword("");
      setError(null);
      setVerifying(true);
      return;
    }
    const draft = {
      name: nameFromEmail(emailValue),
      email: emailValue,
      password: passwordValue,
      confirmPassword: typedVerify,
      acceptedTerms: agreed,
      confirmedAdult: agreed,
      turnstileToken,
    };
    saveJoinAccountDraft(draft);
    if (!typedVerify) {
      setError("Type the password again to verify it, then tap Submit.");
      return;
    }
    if (typedVerify !== passwordValue) {
      setError("That does not match. Type the same password, then tap Submit.");
      return;
    }
    if (!agreed || !canContinueToIdPictures(draft)) {
      setError("Check the box: I agree to the Terms of Use, rules, and regulations.");
      return;
    }
    rememberJoinRulesAgreement();
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
        try {
          await acceptRules.mutateAsync({ accepted: true, version: CONDUCT_RULES_VERSION });
        } catch {
          /* The same box is already saved on this browser. */
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
    <View style={{ gap: 10, width: "100%" }} testID="finish-account-after-id-pass">
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        autoCorrect={false}
        autoFocus={!verifying}
        nativeID="login-email"
        editable={!busy}
        style={inputStyle}
        testID="login-email"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.muted}
        secureTextEntry={verifying}
        autoComplete="new-password"
        textContentType="newPassword"
        nativeID="login-password"
        returnKeyType="go"
        onSubmitEditing={onContinueToId}
        editable={!busy && !verifying}
        style={inputStyle}
        testID="login-password"
      />
      {verifying ? (
        <>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
            Verify your password
          </Text>
          <TextInput
            value={verifyPassword}
            onChangeText={setVerifyPassword}
            placeholder="Verify your password"
            placeholderTextColor={colors.muted}
            secureTextEntry={false}
            autoComplete="new-password"
            textContentType="newPassword"
            autoFocus
            nativeID="verify-password"
            returnKeyType="go"
            onSubmitEditing={onContinueToId}
            editable={!busy}
            style={inputStyle}
            testID="verify-password"
          />
        </>
      ) : null}
      <AgreeAndReadRow
        checked={agreed}
        onToggle={() => setAgreed((value) => !value)}
        label={ONE_AGREEMENT_LABEL}
        href="/terms"
        testID="confirm-over-18"
      />
      <TurnstileWidget action="signup" onToken={setTurnstileToken} />

      {error ? (
        <Text style={{ color: "#c0392b", fontSize: 14, lineHeight: 20 }}>{error}</Text>
      ) : null}

      <PrimaryActionButton
        label="Submit"
        loadingLabel="Saving your email and password…"
        loading={busy}
        onPress={onContinueToId}
        backgroundColor={colors.primary}
        testID="finish-account-create"
      />
    </View>
  );
}
