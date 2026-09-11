import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { useLoginScreen } from "@/hooks/use-login-screen";
import { ID_MUST_PASS_FIRST, LOGIN_PAGE_WHY } from "@/lib/signup-step-copy";
import { hasAgeKycPassToken } from "@/lib/age-kyc-pass-store";
import { IdCheckDuringSignin } from "@/components/id-check-during-signin";
import { FinishAccountAfterIdPass } from "@/components/finish-account-after-id-pass";

/** Same login on website and native app — pictures first, then name / email / password. */
export default function LoginScreen() {
  const colors = useColors();
  const { serviceHint } = useLoginScreen();
  const [idPassed, setIdPassed] = useState(() => hasAgeKycPassToken());
  const onIdPassed = useCallback(() => setIdPassed(true), []);
  const onIdReset = useCallback(() => setIdPassed(false), []);

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
            <Link href="/download" style={{ color: colors.primary, fontSize: 13, fontWeight: "700", marginBottom: 8 }}>
              Download the app from this website
            </Link>
            <Text style={[styles.title, { color: colors.foreground }]}>UR Platform</Text>
            <Text style={{ fontSize: 16, color: colors.muted, marginBottom: 8 }}>
              Sign in to your account
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 16 }}>
              {LOGIN_PAGE_WHY}
            </Text>
            <IdCheckDuringSignin onPassed={onIdPassed} onReset={onIdReset} />
            {idPassed ? (
              <>
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
                <View style={{ marginTop: 16 }}>
                  <FinishAccountAfterIdPass />
                </View>
              </>
            ) : (
              <Text
                style={{ color: colors.foreground, fontWeight: "800", fontSize: 16, marginTop: 20, marginBottom: 8 }}
                testID="id-check-gate"
              >
                {ID_MUST_PASS_FIRST}
              </Text>
            )}

            <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", marginTop: 20 }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: colors.primary, fontWeight: "700" }}>
                Sign up
              </Link>
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 16 }}>
              <Link href="/terms" style={{ color: colors.primary, fontWeight: "700" }}>
                Terms
              </Link>
              {" · "}
              <Link href="/privacy" style={{ color: colors.primary, fontWeight: "700" }}>
                Privacy
              </Link>
              {" · "}
              <Link href="/refunds" style={{ color: colors.primary, fontWeight: "700" }}>
                Refunds
              </Link>
              {" · "}
              <Link href="/cancellations" style={{ color: colors.primary, fontWeight: "700" }}>
                Cancel
              </Link>
              {" · "}
              <Link href="/contact" style={{ color: colors.primary, fontWeight: "700" }}>
                Contact
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
