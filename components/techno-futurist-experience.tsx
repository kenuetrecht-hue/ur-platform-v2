import { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Platform, useWindowDimensions, Pressable } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { useTypewriter } from "@/hooks/use-typewriter";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { LandingWebglBackdrop } from "@/components/landing/landing-webgl-backdrop";
import { LandingBentoGrid } from "@/components/landing/landing-bento-grid";
import { LandingDemoChat } from "@/components/landing/landing-demo-chat";
import { LandingTownHallCarousel } from "@/components/landing/landing-town-hall-carousel";
import { LandingSocialProof } from "@/components/landing/landing-social-proof";
import { LandingCheckoutCta } from "@/components/landing/landing-checkout-cta";
import { LandingPromoBanner } from "@/components/landing/landing-promo-banner";
import { LandingAiCategoryHub } from "@/components/landing/landing-ai-category-hub";
import { LANDING_DEMO_CREATOR_IDS } from "@/lib/landing-demo-policy";
import { buildCreatorSignupHref } from "@/lib/launch-promotion-config";

const HEADLINE =
  "The future of specialist AI is collaborative, secure, and live.";

const DEFAULT_DEMO_CREATOR = LANDING_DEMO_CREATOR_IDS[0];

export function TechnoFuturistExperience() {
  const { width } = useWindowDimensions();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { display, done } = useTypewriter(HEADLINE, 32, 500);
  const isWide = width >= 900;
  const maxW = Math.min(width, 1100);
  const [demoCreatorId, setDemoCreatorId] = useState<string>(DEFAULT_DEMO_CREATOR);

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

          <LandingPromoBanner />

          <View style={styles.heroCtaRow}>
            <Pressable onPress={() => router.push("/login")} style={styles.heroSignIn}>
              <Text style={styles.heroSignInText}>Sign in</Text>
            </Pressable>
            <Pressable onPress={() => router.push(buildCreatorSignupHref() as never)} style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Create account →</Text>
            </Pressable>
          </View>

          <LandingAiCategoryHub
            selectedCreatorId={demoCreatorId}
            onSelectCreator={setDemoCreatorId}
          />

          <LandingDemoChat creatorId={demoCreatorId} onCreatorIdChange={setDemoCreatorId} />
          <LandingTownHallCarousel />
          <LandingBentoGrid isWide={isWide} />
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
  safe: { flex: 1, zIndex: 1 },
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
    borderColor: T.brandBlueLight,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  signInBtnText: { color: T.brandBlueLight, fontWeight: "800", fontSize: 13 },
  kicker: {
    color: T.brandPurpleLight,
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
    marginBottom: 18,
  },
  cursor: { color: T.electric, fontWeight: "300" },
  heroCtaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
    alignItems: "center",
  },
  heroSignIn: {
    borderWidth: 1,
    borderColor: T.brandBlueLight,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  heroSignInText: { color: T.brandBlueLight, fontWeight: "800", fontSize: 15 },
  heroCta: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: T.brandBlue,
    borderWidth: 1,
    borderColor: T.brandPurpleLight,
  },
  heroCtaText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  footer: { alignItems: "center", paddingTop: 8 },
});
