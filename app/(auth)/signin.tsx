import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { ReturningAccountLogin } from "@/components/returning-account-login";

/** Returning members: email + password only. New members join on /login. */
export default function ReturningSignInScreen() {
  const colors = useColors();

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
        >
          <View style={styles.card} testID="returning-signin-form">
            <Link href="/welcome" style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>
              ← Back to homepage
            </Link>
            <Text style={[styles.title, { color: colors.primary }]}>UR</Text>
            <Text style={{ fontSize: 22, color: colors.foreground, fontWeight: "800", marginBottom: 8 }}>
              Log in
            </Text>
            <Text style={{ fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: 16 }}>
              You already have an account. Type your email and password. This phone or computer
              will remember you if you leave Stay logged in checked.
            </Text>
            <ReturningAccountLogin variant="page" />
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
});
