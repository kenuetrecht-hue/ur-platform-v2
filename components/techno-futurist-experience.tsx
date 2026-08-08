import { ScrollView, View, Text, StyleSheet, Platform, useWindowDimensions, Pressable } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { useTypewriter } from "@/hooks/use-typewriter";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { LANDING_PLATFORM_UNITY_LINE } from "@/lib/landing-platform-copy";
import { LandingWebglBackdrop } from "@/components/landing/landing-webgl-backdrop";
import { LandingBentoGrid } from "@/components/landing/landing-bento-grid";
import { LandingDemoChat } from "@/components/landing/landing-demo-chat";
import { LandingTownHallCarousel } from "@/components/landing/landing-town-hall-carousel";
import { LandingSocialProof } from "@/components/landing/landing-social-proof";
import { LandingCheckoutCta } from "@/components/landing/landing-checkout-cta";

const HEADLINE =
  "The future of specialist AI is collaborative, secure, and live.";

export function TechnoFuturistExperience() {
  const { width } = useWindowDimensions();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { display, done } = useTypewriter(HEADLINE, 32, 500);
  const isWide = width >= 900;
  const maxW = Math.min(width, 1100);

  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.root}>
      <LandingWebglBackdrop />
      {Platform.OS === "web" ? (
        <View style={styles.scanlines} className="techno-scanlines-overlay" pointerEvents="none" />
      ) : null}

      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { maxWidth: maxW, width: "100%", alignSelf: "center" }]}
          showsVerticalScrollIndicator={Platform.OS === "web"}
        >
          <View style={styles.topBar}>
            <Text style={styles.logo}>UR PLATFORM</Text>
            <View style={styles.topLinks}>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push("/login")}
                style={styles.signInBtn}
              >
                <Text style={styles.signInBtnText}>Sign in</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.kicker}>TECHNO-FUTURIST · INTERACTIVE EXPERIENCE</Text>
          <Text style={styles.headline}>
            {display}
            {!done ? <Text style={styles.cursor}>|</Text> : null}
          </Text>
          <Text style={styles.lede}>
            {LANDING_PLATFORM_UNITY_LINE} Sign in for full access to every specialist, live classes,
            and your creator hub. Preview one demo message below — no account needed for the test drive.
          </Text>

          <View style={styles.heroCtaRow}>
            <Pressable onPress={() => router.push("/login")} style={styles.heroSignIn}>
              <Text style={styles.heroSignInText}>Sign in</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/signup")} style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Create account →</Text>
            </Pressable>
          </View>

          <LandingBentoGrid isWide={isWide} />
          <LandingDemoChat />
          <LandingTownHallCarousel />
          <LandingSocialProof />
          <LandingCheckoutCta />

          <View style={styles.footer}>
            <Pressable accessibilityRole="link" onPress={() => router.push("/login")}>
              <Text style={styles.link}>Already have an account? Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scanlines: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 8 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  logo: { color: T.electric, fontWeight: "900", letterSpacing: 2, fontSize: 13 },
  topLinks: { flexDirection: "row", gap: 12, alignItems: "center" },
  link: { color: T.electric, fontWeight: "700", fontSize: 14 },
  signInBtn: {
    borderWidth: 1,
    borderColor: T.electric,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  signInBtnText: { color: T.electric, fontWeight: "800", fontSize: 13 },
  kicker: {
    color: T.electricDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 12,
  },
  headline: {
    color: T.text,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 44,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  cursor: { color: T.electric, fontWeight: "300" },
  lede: { color: T.muted, fontSize: 16, lineHeight: 24, marginBottom: 20, maxWidth: 640 },
  heroCtaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  heroSignIn: {
    borderWidth: 1,
    borderColor: T.electric,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  heroSignInText: { color: T.electric, fontWeight: "800", fontSize: 15 },
  heroCta: {
    backgroundColor: T.electric,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  heroCtaText: { color: "#001018", fontWeight: "800", fontSize: 15 },
  footer: { alignItems: "center", paddingTop: 8 },
});
