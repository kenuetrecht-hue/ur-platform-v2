import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { showUserMessage } from "@/lib/show-user-message";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleLogin = async () => {
    setFormError(null);

    if (!email.trim() || !password.trim()) {
      const msg = "Please enter email and password.";
      setFormError(msg);
      showUserMessage("Error", msg);
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password.trim());
      router.replace("/(tabs)");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Sign in failed. Please try again.";
      setFormError(msg);
      showUserMessage("Login Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.foreground,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <View style={styles.header}>
            <Link href="/welcome" style={{ color: colors.muted, fontSize: 13 }}>
              ← Back to homepage
            </Link>
            <Text style={[styles.title, { color: colors.foreground }]}>UR Platform</Text>
            <Text style={{ fontSize: 16, color: colors.muted }}>
              Sign in to your account
            </Text>
          </View>

          {formError ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: colors.surface, borderColor: colors.error ?? "#ef4444" },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.error ?? "#ef4444" }]}>
                {formError}
              </Text>
            </View>
          ) : null}

          <View style={styles.fields}>
            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (formError) setFormError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                editable={!submitting}
                style={inputStyle}
                returnKeyType="next"
              />
            </View>

            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (formError) setFormError(null);
                }}
                placeholder="Your password"
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                editable={!submitting}
                style={inputStyle}
                returnKeyType="go"
                onSubmitEditing={() => {
                  void handleLogin();
                }}
              />
            </View>
          </View>

          <Pressable
            onPress={() => {
              void handleLogin();
            }}
            disabled={submitting}
            accessibilityRole="button"
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              opacity: submitting ? 0.6 : pressed ? 0.9 : 1,
              ...(Platform.OS === "web" ? ({ cursor: submitting ? "default" : "pointer" } as object) : null),
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
              {submitting ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>

          <View style={{ alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: colors.primary, fontWeight: "700" }}>
                Sign up
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, zIndex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  form: { gap: 24, zIndex: 2 },
  header: { alignItems: "center", gap: 8 },
  title: { fontSize: 32, fontWeight: "bold" },
  fields: { gap: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
