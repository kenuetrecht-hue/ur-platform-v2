import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, type Href } from "expo-router";
import { AuthDoorStage } from "@/components/auth-door-stage";
import { LANDING_THEME as T } from "@/lib/landing-theme";

type Props = {
  title: string;
  lede: string;
  testID: string;
  backHref: Href;
  backLabel: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Shared Sign up chrome so account / ID / selfie pages stay light and match. */
export function SignupDoorShell({
  title,
  lede,
  testID,
  backHref,
  backLabel,
  children,
  footer,
}: Props) {
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
          <View style={styles.card} testID={testID}>
            <Link href={backHref} style={styles.back}>
              {backLabel}
            </Link>
            <Text style={styles.brand}>UR</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.lede}>{lede}</Text>
            {children}
            {footer}
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
});
