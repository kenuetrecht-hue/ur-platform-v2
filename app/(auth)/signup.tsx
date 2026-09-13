import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { AuthDoorStage } from "@/components/auth-door-stage";
import { useLoginScreen } from "@/hooks/use-login-screen";
import { FinishAccountAfterIdPass } from "@/components/finish-account-after-id-pass";
import { RETURNING_LOGIN_HREF } from "@/lib/after-sign-in";
import { LANDING_THEME as T } from "@/lib/landing-theme";

/** New members: name, email, password, then the three pictures. */
export default function SignupScreen() {
  const { serviceHint } = useLoginScreen();

  return (
    <AuthDoorStage>
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
          <View style={styles.card} testID="signup-form">
            <Link href={RETURNING_LOGIN_HREF} style={styles.back}>
              ← Back to login
            </Link>
            <Text style={styles.brand}>UR</Text>
            <Text style={styles.title}>Sign up</Text>
            <Text style={styles.lede}>
              Name, email, and password first. Then the three pictures. After they pass, we log
              you in.
            </Text>
            {serviceHint ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{serviceHint}</Text>
              </View>
            ) : null}
            <FinishAccountAfterIdPass />
            <Link href={RETURNING_LOGIN_HREF}>
              <LinearGradient
                colors={[T.brandBlue, T.brandPurple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loginBubble}
              >
                <Text style={styles.loginKicker}>Already a member?</Text>
                <Text style={styles.loginLabel}>Login</Text>
              </LinearGradient>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthDoorStage>
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
    maxWidth: 440,
    borderRadius: 28,
    padding: 28,
    gap: 12,
    backgroundColor: "rgba(7, 8, 13, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.45)",
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 24px 80px rgba(124, 58, 237, 0.4), 0 0 0 1px rgba(0, 212, 255, 0.12)",
        } as object)
      : {
          shadowColor: T.brandBlue,
          shadowOpacity: 0.5,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 16 },
          elevation: 16,
        }),
  },
  back: {
    color: T.muted,
    fontSize: 13,
    marginBottom: 4,
  },
  brand: {
    color: T.electric,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 6,
    textAlign: "center",
  },
  title: {
    color: T.text,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  lede: {
    color: T.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(255, 180, 180, 0.45)",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: "#ffb4b4",
  },
  loginBubble: {
    marginTop: 12,
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: "center",
    minWidth: 180,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  loginKicker: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "600",
  },
  loginLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});
