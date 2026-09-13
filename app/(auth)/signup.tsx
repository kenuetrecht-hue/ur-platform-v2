import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useLoginScreen } from "@/hooks/use-login-screen";
import { FinishAccountAfterIdPass } from "@/components/finish-account-after-id-pass";
import { SignupDoorShell } from "@/components/signup-door-shell";
import { RETURNING_LOGIN_HREF } from "@/lib/after-sign-in";
import { LANDING_THEME as T } from "@/lib/landing-theme";

/** Sign up page 1: account only. No cameras. */
export default function SignupScreen() {
  const { serviceHint } = useLoginScreen();

  return (
    <SignupDoorShell
      title="Sign up"
      lede="Name, email, and password. Check the Terms on this page. Then continue to ID pictures. No camera here."
      testID="signup-form"
      backHref={RETURNING_LOGIN_HREF}
      backLabel="← Back to login"
      footer={
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
      }
    >
      {serviceHint ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{serviceHint}</Text>
        </View>
      ) : null}
      <FinishAccountAfterIdPass />
    </SignupDoorShell>
  );
}

const styles = StyleSheet.create({
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
