import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { AuthDoorStage } from "@/components/auth-door-stage";
import { ReturningAccountLogin } from "@/components/returning-account-login";
import { useLoginScreen } from "@/hooks/use-login-screen";
import { JOIN_ACCOUNT_HREF } from "@/lib/after-sign-in";
import {
  LOGIN_PAYOUT_BANNER_STAY,
  LOGIN_PAYOUT_BANNER_SPLIT,
  LOGIN_PAYOUT_BANNER_TIPS,
} from "@/lib/login-payout-banner";
import { LANDING_THEME as T } from "@/lib/landing-theme";

/** First door: email, password, Login. Sign up is a bubble. */
export default function LoginScreen() {
  const { serviceHint } = useLoginScreen();

  return (
    <AuthDoorStage>
      <LinearGradient
        colors={[T.brandBlue, T.brandPurple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.payoutBanner}
        testID="login-payout-banner"
      >
        <Text style={styles.payoutStay}>{LOGIN_PAYOUT_BANNER_STAY}</Text>
        <Text style={styles.payoutSplit}>{LOGIN_PAYOUT_BANNER_SPLIT}</Text>
        <Text style={styles.payoutTips}>{LOGIN_PAYOUT_BANNER_TIPS}</Text>
      </LinearGradient>
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
            <Text style={styles.brand}>UR</Text>
            <Text style={styles.title}>Login</Text>
            {serviceHint ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{serviceHint}</Text>
              </View>
            ) : null}
            <ReturningAccountLogin variant="page" />
            <Link href={JOIN_ACCOUNT_HREF} testID="go-to-signup">
              <LinearGradient
                colors={[T.brandBlue, T.brandPurple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.signupBubble}
              >
                <Text style={styles.signupKicker}>New here?</Text>
                <Text style={styles.signupLabel}>Sign up</Text>
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
  payoutBanner: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
  },
  payoutStay: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  payoutSplit: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  payoutTips: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
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
    borderRadius: 28,
    padding: 28,
    gap: 16,
    backgroundColor: "rgba(7, 8, 13, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.45)",
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 24px 80px rgba(79, 70, 229, 0.45), 0 0 0 1px rgba(0, 212, 255, 0.12)",
        } as object)
      : {
          shadowColor: T.brandPurple,
          shadowOpacity: 0.55,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 16 },
          elevation: 16,
        }),
  },
  brand: {
    color: T.electric,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 6,
    textAlign: "center",
  },
  title: {
    color: T.text,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
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
  signupBubble: {
    marginTop: 8,
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: "center",
    minWidth: 180,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  signupKicker: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "600",
  },
  signupLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});
