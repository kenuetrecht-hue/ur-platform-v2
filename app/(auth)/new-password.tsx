import { useEffect, useState } from "react";
import { Text, TextInput, View, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SignupDoorShell } from "@/components/signup-door-shell";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { RETURNING_LOGIN_HREF } from "@/lib/after-sign-in";
import { PUBLIC_WEBSITE_ORIGIN } from "@/lib/password-recovery-url";
import { getSupabaseClientAsync } from "@/lib/supabase";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { passwordsMatch } from "@/lib/join-account-draft";
import { useColors } from "@/hooks/use-colors";

/** After the inbox link: set a new password, then Login. */
export default function NewPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkReady, setLinkReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = await getSupabaseClientAsync();
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setLinkReady(Boolean(data.session));
          if (!data.session) {
            setError(
              `This page needs the email link. Open ${PUBLIC_WEBSITE_ORIGIN}/login and tap Send a new password.`,
            );
          }
        }
      } catch {
        if (!cancelled) {
          setError("This page needs the email link. Open Login and tap Send a new password.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const onSave = async () => {
    if (!linkReady) {
      setError(
        `This page needs the email link. Open ${PUBLIC_WEBSITE_ORIGIN}/login and tap Send a new password.`,
      );
      return;
    }
    if (!passwordsMatch(password, confirmPassword)) {
      setError("Type the new password twice. Both lines must match and have at least 6 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = await getSupabaseClientAsync();
      const { error: updateError } = await supabase.auth.updateUser({ password: password.trim() });
      if (updateError) throw updateError;
      router.replace(RETURNING_LOGIN_HREF);
    } catch (err) {
      setError(explainAuthFailure(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SignupDoorShell
      title="New password"
      lede="Type the new password twice. Then we send you to Login."
      testID="new-password-form"
      backHref={RETURNING_LOGIN_HREF}
      backLabel="← Back to login"
    >
      <Text style={{ color: colors.foreground, fontWeight: "600" }}>New password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        placeholderTextColor={colors.muted}
        secureTextEntry={!showPassword}
        style={inputStyle}
        testID="new-password"
      />
      <Text style={{ color: colors.foreground, fontWeight: "600" }}>Type the password again</Text>
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Same password as above"
        placeholderTextColor={colors.muted}
        secureTextEntry={!showPassword}
        style={inputStyle}
        testID="new-password-confirm"
      />
      <Text
        onPress={() => setShowPassword((value) => !value)}
        style={{ color: colors.primary, fontWeight: "800" }}
      >
        {showPassword ? "Hide password" : "Show password"}
      </Text>
      {error ? <Text style={{ color: "#c0392b", fontSize: 14 }}>{error}</Text> : null}
      <View style={{ height: 4 }} />
      <PrimaryActionButton
        label="Save password and go to Login"
        loadingLabel="Saving…"
        loading={busy}
        onPress={() => void onSave()}
        backgroundColor={colors.primary}
        testID="save-new-password"
      />
    </SignupDoorShell>
  );
}
