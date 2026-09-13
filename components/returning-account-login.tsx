import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { claimStoredAgeKycPass } from "@/lib/claim-stored-age-kyc-pass";
import { AFTER_ID_PASS_HREF, JOIN_ACCOUNT_HREF } from "@/lib/after-sign-in";
import { EXISTING_ACCOUNT_LOGIN_HINT } from "@/lib/existing-join-login";
import { loadJoinAccountDraft } from "@/lib/join-account-draft";
import { sendPasswordResetEmail } from "@/lib/send-password-reset";
import { getStayLoggedIn, setStayLoggedIn } from "@/lib/stay-logged-in";
import { rememberSignedInApiDevice } from "@/lib/known-api-device";
import { useColors } from "@/hooks/use-colors";
import { LANDING_THEME as T } from "@/lib/landing-theme";

type Variant = "homepage" | "page";

export function ReturningAccountLogin({ variant = "page" }: { variant?: Variant }) {
  const router = useRouter();
  const colors = useColors();
  const { login } = useAuth();
  const verifyTurnstile = trpc.auth.verifyTurnstile.useMutation();
  const claimPass = trpc.ageKyc.claimPass.useMutation();
  const turnstileConfig = trpc.auth.turnstileConfig.useQuery(undefined, { staleTime: 60_000 });
  const params = useLocalSearchParams<{ existing?: string }>();
  const saved = loadJoinAccountDraft();
  const alreadyJoined = params.existing === "1";
  const [email, setEmail] = useState(saved.email);
  const [password, setPassword] = useState(saved.password);
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedInBox] = useState(() => getStayLoggedIn());
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(alreadyJoined ? EXISTING_ACCOUNT_LOGIN_HINT : null);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const homepage = variant === "homepage";
  const staged = variant === "page" || homepage;
  const inputStyle = {
    backgroundColor: staged ? "rgba(255,255,255,0.08)" : colors.surface,
    borderColor: staged ? "rgba(255,255,255,0.28)" : colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: staged ? T.text : colors.foreground,
    width: "100%" as const,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  };
  const labelColor = staged ? T.text : colors.foreground;
  const mutedColor = staged ? T.muted : colors.muted;
  const linkColor = staged ? T.electric : colors.primary;

  const onSubmit = async () => {
    const emailValue = email.trim();
    const passwordValue = password.trim();
    if (!emailValue || !passwordValue) {
      setError("Type your email and password, then tap Login.");
      return;
    }
    setStayLoggedIn(stayLoggedIn);
    setBusy(true);
    setError(null);
    try {
      if (turnstileConfig.data?.required && !turnstileToken.trim()) {
        throw new Error("Complete the security check, then tap Login.");
      }
      if (turnstileToken.trim()) {
        try {
          await verifyTurnstile.mutateAsync({ token: turnstileToken, action: "login" });
        } catch {
          /* Sign-in can still work if the check already ran. */
        }
      }
      await login(emailValue, passwordValue, turnstileToken || undefined);
      rememberSignedInApiDevice();
      try {
        await claimStoredAgeKycPass((input) => claimPass.mutateAsync(input));
      } catch {
        /* Returning members already passed ID on the account. */
      }
      router.replace(AFTER_ID_PASS_HREF);
    } catch (err) {
      setError(explainAuthFailure(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      testID={homepage ? "homepage-sign-in" : "returning-account-login"}
      style={{
        width: "100%",
        gap: 10,
        ...(homepage
          ? {
              marginTop: 16,
              marginBottom: 8,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.22)",
              backgroundColor: "rgba(7,8,13,0.55)",
            }
          : { gap: 12 }),
      }}
    >
      {homepage ? (
        <Text style={{ color: labelColor, fontWeight: "800", fontSize: 18 }}>Login</Text>
      ) : null}
      <Text style={{ color: mutedColor, fontSize: 14, lineHeight: 20 }}>
        Email is your username. Then your password. No pictures on this page.
      </Text>

      <Text style={{ color: labelColor, fontWeight: "600" }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={mutedColor}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        autoCorrect={false}
        editable={!busy}
        nativeID="login-email"
        testID="login-email"
        maxLength={254}
        style={inputStyle}
      />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: labelColor, fontWeight: "600" }}>Password</Text>
        <Pressable
          onPress={() => setShowPassword((value) => !value)}
          hitSlop={10}
          testID="show-password"
          accessibilityRole="button"
          style={{ paddingVertical: 6, paddingHorizontal: 8 }}
        >
          <Text style={{ color: linkColor, fontWeight: "800", fontSize: 14 }}>
            {showPassword ? "Hide password" : "Show password"}
          </Text>
        </Pressable>
      </View>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        placeholderTextColor={mutedColor}
        secureTextEntry={!showPassword}
        autoComplete="current-password"
        textContentType="password"
        editable={!busy}
        nativeID="login-password"
        testID="login-password"
        maxLength={128}
        style={inputStyle}
      />

      <Pressable
        onPress={() => {
          setStayLoggedInBox((value) => {
            const next = !value;
            setStayLoggedIn(next);
            return next;
          });
        }}
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        testID="stay-logged-in"
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: stayLoggedIn ? linkColor : staged ? "rgba(255,255,255,0.4)" : colors.border,
            backgroundColor: stayLoggedIn ? linkColor : "transparent",
          }}
        />
        <Text style={{ color: labelColor, fontSize: 14, flex: 1 }}>
          Stay logged in on this phone or computer
        </Text>
      </Pressable>

      <TurnstileWidget action="login" onToken={setTurnstileToken} />

      {error ? (
        <Text style={{ color: staged ? "#ffb4b4" : "#c0392b", fontSize: 14, lineHeight: 20 }}>
          {error}
        </Text>
      ) : null}

      <PrimaryActionButton
        label="Login"
        loadingLabel="Logging you in…"
        loading={busy}
        onPress={() => void onSubmit()}
        backgroundColor={staged ? T.brandPurple : colors.primary}
        testID={homepage ? "homepage-sign-in-submit" : "returning-login-submit"}
      />
      <PrimaryActionButton
        label="Send a new password to this email"
        loadingLabel="Sending…"
        loading={resetBusy}
        onPress={() => {
          void (async () => {
            const emailValue = email.trim();
            if (!emailValue) {
              setError("Type your email, then tap Send a new password.");
              return;
            }
            setResetBusy(true);
            setError(null);
            try {
              await sendPasswordResetEmail(emailValue);
              setError(
                "If this email is on UR, check your inbox. Open the link, type a new password twice, then Login.",
              );
            } catch (err) {
              setError(explainAuthFailure(err));
            } finally {
              setResetBusy(false);
            }
          })();
        }}
        backgroundColor={staged ? T.brandBlue : colors.muted}
        testID="send-new-password"
      />

      {homepage ? (
        <Link href={JOIN_ACCOUNT_HREF} style={{ color: linkColor, fontWeight: "700", fontSize: 14 }}>
          New to UR? Sign up
        </Link>
      ) : null}
    </View>
  );
}
