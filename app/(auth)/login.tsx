import React from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { Link, Redirect } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { useLoginScreen } from "@/hooks/use-login-screen";

/** Native login (iOS / Android). Browser uses login.web.tsx instead. */
export default function LoginScreen() {
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
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  };

  return (
    <ScreenContainer className="bg-background">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.form} testID="login-form">
            <View style={styles.header}>
              <Link href="/welcome" style={{ color: colors.muted, fontSize: 13 }}>
                ← Back to homepage
              </Link>
              <Text style={[styles.title, { color: colors.foreground }]}>UR Platform</Text>
              <Text style={{ fontSize: 16, color: colors.muted }}>
                Sign in to your account
              </Text>
            </View>

            {displayError ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: colors.surface, borderColor: colors.error ?? "#ef4444" },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.error ?? "#ef4444" }]}>
                  {displayError}
                </Text>
              </View>
            ) : null}

            {statusLine && !displayError ? (
              <Text style={[styles.statusText, { color: colors.primary }]}>{statusLine}</Text>
            ) : null}

            <View style={styles.fields}>
              <View>
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
                  returnKeyType="next"
                />
              </View>

              <View>
                <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
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
                  returnKeyType="go"
                  onSubmitEditing={() => {
                    void handleLogin();
                  }}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryActionButton
            label="Sign In"
            loadingLabel="Signing in..."
            loading={submitting}
            onPress={handleLogin}
            backgroundColor={colors.primary}
            testID="login-submit"
          />

          <View style={{ alignItems: "center", marginTop: 16 }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: colors.primary, fontWeight: "700" }}>
                Sign up
              </Link>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingBottom: 12,
  },
  form: { gap: 24 },
  header: { alignItems: "center", gap: 8 },
  title: { fontSize: 32, fontWeight: "bold" },
  fields: { gap: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
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
  statusText: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
});
