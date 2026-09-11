import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { claimStoredAgeKycPass } from "@/lib/claim-stored-age-kyc-pass";
import { hrefAfterSignIn } from "@/lib/after-sign-in";
import { getStayLoggedIn, setStayLoggedIn } from "@/lib/stay-logged-in";

/** Email and password on the homepage so a saved browser login has a place to land. */
export function HomepageSignIn() {
  const router = useRouter();
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

  const inputStyle = {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: T.text,
    width: "100%" as const,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  };

  const onSubmit = async () => {
    const emailValue = email.trim();
    const passwordValue = password.trim();
    if (!emailValue || !passwordValue) {
      setError("Type the email and password your browser already saved, then tap Sign me in.");
      return;
    }
    setStayLoggedIn(stayLoggedIn);
    setBusy(true);
    setError(null);
    try {
      if (turnstileConfig.data?.required && !turnstileToken.trim()) {
        throw new Error("Complete the security check, then tap Sign me in.");
      }
      await verifyTurnstile.mutateAsync({ token: turnstileToken, action: "login" });
      await login(emailValue, passwordValue, turnstileToken || undefined);
      let claimed = false;
      try {
        claimed = await claimStoredAgeKycPass((input) => claimPass.mutateAsync(input));
      } catch {
        claimed = false;
      }
      router.replace(hrefAfterSignIn(claimed));
    } catch (err) {
      setError(explainAuthFailure(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      testID="homepage-sign-in"
      style={{
        width: "100%",
        gap: 10,
        marginTop: 16,
        marginBottom: 8,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.22)",
        backgroundColor: "rgba(7,8,13,0.55)",
      }}
    >
      <Text style={{ color: T.text, fontWeight: "800", fontSize: 18 }}>
        Sign in here
      </Text>
      <Text style={{ color: T.muted, fontSize: 14, lineHeight: 20 }}>
        If your browser says the password is already saved, type or pick it below.
      </Text>

      <Text style={{ color: T.text, fontWeight: "600" }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={T.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        autoCorrect={false}
        editable={!busy}
        nativeID="login-email"
        testID="login-email"
        style={inputStyle}
      />

      <Text style={{ color: T.text, fontWeight: "600" }}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        placeholderTextColor={T.muted}
        secureTextEntry={!showPassword}
        autoComplete="current-password"
        textContentType="password"
        editable={!busy}
        nativeID="login-password"
        testID="login-password"
        style={inputStyle}
      />
      <Pressable onPress={() => setShowPassword((value) => !value)}>
        <Text style={{ color: T.electric, fontWeight: "700", fontSize: 13 }}>
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
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: stayLoggedIn ? T.electric : "rgba(255,255,255,0.4)",
            backgroundColor: stayLoggedIn ? T.electric : "transparent",
          }}
        />
        <Text style={{ color: T.text, fontSize: 14, flex: 1 }}>Stay logged in</Text>
      </Pressable>

      <TurnstileWidget action="login" onToken={setTurnstileToken} />

      {error ? (
        <Text style={{ color: "#ffb4b4", fontSize: 14, lineHeight: 20 }}>{error}</Text>
      ) : null}

      <PrimaryActionButton
        label="Sign me in"
        loadingLabel="Signing you in…"
        loading={busy}
        onPress={() => void onSubmit()}
        backgroundColor={T.electric}
        testID="homepage-sign-in-submit"
      />
    </View>
  );
}
