import React from "react";
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { useLoginScreen } from "@/hooks/use-login-screen";
import { FinishAccountAfterIdPass } from "@/components/finish-account-after-id-pass";

/** Same page: name / email / password first, then pictures, then enter. */
export default function LoginScreen() {
  const colors = useColors();
  const { serviceHint } = useLoginScreen();

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
            <Link href="/signin" style={{ color: colors.primary, fontSize: 14, fontWeight: "700", marginBottom: 12 }}>
              Already have an account? Log in with email and password
            </Link>
            <Text style={[styles.title, { color: colors.primary }]}>UR</Text>
            <Text style={{ fontSize: 22, color: colors.foreground, fontWeight: "800", marginBottom: 8 }}>
              Join or sign in
            </Text>
            <Text style={{ fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: 16 }}>
              Name, email, and password first. Then the three pictures. We sign you in after they pass.
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
            <FinishAccountAfterIdPass />
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
});
