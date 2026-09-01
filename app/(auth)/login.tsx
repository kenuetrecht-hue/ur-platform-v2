import React from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { Link, Redirect } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { WebLoginSubmit } from "@/components/web-login-submit";
import { useLoginScreen } from "@/hooks/use-login-screen";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { TurnstileWidget } from "@/components/turnstile-widget";

/** Same login on website and native app — web uses a DOM submit button so clicks register. */
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
    onTurnstileToken,
    serviceHint,
  } = useLoginScreen();
  const { canAccessAdminDashboard, isLoading: ownerLoading } = usePlatformOwner();

  if (isAuthenticated) {
    if (ownerLoading) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      );
    }
    return <Redirect href={canAccessAdminDashboard ? "/(tabs)/admin" : "/(tabs)"} />;
  }

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
          <View style={styles.card} testID="login-form">
            <Link href="/welcome" style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>
              ← Back to homepage
            </Link>
            <Text style={[styles.title, { color: colors.foreground }]}>UR Platform</Text>
            <Text style={{ fontSize: 16, color: colors.muted, marginBottom: 24 }}>
              Sign in to your account
            </Text>

            {serviceHint ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: colors.surface, borderColor: colors.error ?? "#ef4444" },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.error ?? "#ef4444" }]}>
                  {serviceHint}
                </Text>
              </View>
            ) : null}

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
              returnKeyType="next"
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
              returnKeyType="go"
              onSubmitEditing={() => {
                void handleLogin();
              }}
            />

            <View style={{ marginTop: 16, marginBottom: 4 }}>
              <TurnstileWidget action="login" onToken={onTurnstileToken} />
            </View>

            {Platform.OS === "web" ? (
              <WebLoginSubmit
                label="Sign In"
                loadingLabel="Signing in..."
                loading={submitting}
                backgroundColor={colors.primary}
                onPress={handleLogin}
              />
            ) : (
              <View style={{ marginTop: 24 }}>
                <PrimaryActionButton
                  label="Sign In"
                  loadingLabel="Signing in..."
                  loading={submitting}
                  onPress={handleLogin}
                  backgroundColor={colors.primary}
                  testID="login-submit"
                />
              </View>
            )}

            <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", marginTop: 20 }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: colors.primary, fontWeight: "700" }}>
                Sign up
              </Link>
            </Text>
          </View>
        </ScrollView>
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
    alignItems: "center",
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
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
});
