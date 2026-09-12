import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { claimStoredAgeKycPass } from "@/lib/claim-stored-age-kyc-pass";
import { AFTER_ID_PASS_HREF, JOIN_ACCOUNT_HREF } from "@/lib/after-sign-in";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedInBox] = useState(() => getStayLoggedIn());
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const homepage = variant === "homepage";
  const inputStyle = {
    backgroundColor: homepage ? "rgba(255,255,255,0.08)" : colors.surface,
    borderColor: homepage ? "rgba(255,255,255,0.28)" : colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: homepage ? T.text : colors.foreground,
    width: "100%" as const,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  };
  const labelColor = homepage ? T.text : colors.foreground;
  const mutedColor = homepage ? T.muted : colors.muted;
  const linkColor = homepage ? T.electric : colors.primary;

  const onSubmit = async () => {
    const emailValue = email.trim();
    const passwordValue = password.trim();
    if (!emailValue || !passwordValue) {
      setError("Type your email and password, then tap Log in.");
      return;
    }
    setStayLoggedIn(stayLoggedIn);
    setBusy(true);
    setError(null);
    try {
      if (turnstileConfig.data?.required && !turnstileToken.trim()) {
        throw new Error("Complete the security check, then tap Log in.");
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
      <Text style={{ color: labelColor, fontWeight: "800", fontSize: 18 }}>
        {homepage ? "Log in here" : "Log in"}
      </Text>
      <Text style={{ color: mutedColor, fontSize: 14, lineHeight: 20 }}>
        Already have an account? Email is your username. Then your password. No pictures on this
        page.
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

      <Text style={{ color: labelColor, fontWeight: "600" }}>Password</Text>
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
      <Pressable onPress={() => setShowPassword((value) => !value)}>
        <Text style={{ color: linkColor, fontWeight: "700", fontSize: 13 }}>
          {showPassword ? "Hide password" : "Show password"}
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
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        testID="stay-logged-in"
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: stayLoggedIn ? linkColor : homepage ? "rgba(255,255,255,0.4)" : colors.border,
            backgroundColor: stayLoggedIn ? linkColor : "transparent",
          }}
        />
        <Text style={{ color: labelColor, fontSize: 14, flex: 1 }}>
          Stay logged in on this phone or computer
        </Text>
      </Pressable>

      <TurnstileWidget action="login" onToken={setTurnstileToken} />

      {error ? (
        <Text style={{ color: homepage ? "#ffb4b4" : "#c0392b", fontSize: 14, lineHeight: 20 }}>
          {error}
        </Text>
      ) : null}

      <PrimaryActionButton
        label="Log in"
        loadingLabel="Signing you in…"
        loading={busy}
        onPress={() => void onSubmit()}
        backgroundColor={homepage ? T.electric : colors.primary}
        testID={homepage ? "homepage-sign-in-submit" : "returning-login-submit"}
      />

      <Link href={JOIN_ACCOUNT_HREF} style={{ color: linkColor, fontWeight: "700", fontSize: 14 }}>
        New here? Join and take the three pictures
      </Link>
    </View>
  );
}
