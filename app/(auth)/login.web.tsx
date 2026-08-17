import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Link, Redirect } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useLoginScreen } from "@/hooks/use-login-screen";
import { WebLoginSubmit } from "@/components/web-login-submit";

/**
 * Web-only login — native DOM submit button (RN Web Pressable often drops clicks).
 */
export default function LoginWebScreen() {
  const colors = useColors();
  const {
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
  } = useLoginScreen();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const inputStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.foreground,
    outlineStyle: "none" as const,
    width: "100%",
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.card}>
        <Link href="/welcome" style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>
          ← Back to homepage
        </Link>
        <Text style={[styles.title, { color: colors.foreground }]}>UR Platform</Text>
        <Text style={{ fontSize: 16, color: colors.muted, marginBottom: 24 }}>
          Sign in to your account
        </Text>

        {displayError ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: colors.surface, borderColor: colors.error ?? "#ef4444" },
            ]}
          >
            <Text style={{ color: colors.error ?? "#ef4444", textAlign: "center" }}>
              {displayError}
            </Text>
          </View>
        ) : null}

        {statusLine && !displayError ? (
          <Text style={[styles.status, { color: colors.primary }]}>{statusLine}</Text>
        ) : null}

        <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
        <TextInput
          ref={emailRef}
          value={email}
          onChangeText={onEmailChange}
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          testID="login-email"
          editable={!submitting}
          style={inputStyle}
        />

        <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>Password</Text>
        <TextInput
          ref={passwordRef}
          value={password}
          onChangeText={onPasswordChange}
          placeholder="Your password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          testID="login-password"
          editable={!submitting}
          style={inputStyle}
          onSubmitEditing={() => {
            void handleLogin();
          }}
        />

        <WebLoginSubmit
          label="Sign In"
          loadingLabel="Signing in..."
          loading={submitting}
          backgroundColor={colors.primary}
          onPress={handleLogin}
        />

        <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", marginTop: 20 }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: colors.primary, fontWeight: "700" }}>
            Sign up
          </Link>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: "100vh" as unknown as number,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
});
