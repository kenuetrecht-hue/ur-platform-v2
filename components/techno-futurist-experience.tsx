import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { Link, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useStableWindowWidth } from "@/hooks/use-stable-window-width";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { LANDING_PLATFORM_UNITY_LINE } from "@/lib/landing-platform-copy";
import { LandingWebglBackdrop } from "@/components/landing/landing-webgl-backdrop";
import { LandingBentoGrid } from "@/components/landing/landing-bento-grid";
import { LandingDemoChat } from "@/components/landing/landing-demo-chat";
import { LandingTownHallCarousel } from "@/components/landing/landing-town-hall-carousel";
import { LandingSocialProof } from "@/components/landing/landing-social-proof";
import { LandingCheckoutCta } from "@/components/landing/landing-checkout-cta";
import { LandingAppDownloadLink } from "@/components/landing/landing-app-download-link";
import { LandingPromoBanner } from "@/components/landing/landing-promo-banner";
import { LandingAiCategoryHub } from "@/components/landing/landing-ai-category-hub";
import { LANDING_DEMO_CREATOR_IDS } from "@/lib/landing-demo-policy";
import { buildCreatorSignupHref } from "@/lib/launch-promotion-config";
import { PLATFORM_DISCLOSURE_SHORT } from "@/lib/platform-disclosure-copy";

const HEADLINE =
  "The future of specialist AI is collaborative, secure, and live.";

const DEFAULT_DEMO_CREATOR = LANDING_DEMO_CREATOR_IDS[0];

function LandingSignInButton({ variant }: { variant: "top" | "hero" }) {
  const buttonStyle = variant === "top" ? styles.signInBtn : styles.heroSignIn;
  const textStyle = variant === "top" ? styles.signInBtnText : styles.heroSignInText;

  return (
    <Link href="/login" asChild>
      <Pressable style={buttonStyle} accessibilityRole="link">
        <Text style={textStyle}>Sign in</Text>
      </Pressable>
    </Link>
  );
}

export function TechnoFuturistExperience() {
  const width = useStableWindowWidth();
  const { isAuthenticated, isLoading } = useAuth();
  const { display, done } = useTypewriter(HEADLINE, 32, 500);
  const isWide = width >= 900;
  const contentMaxWidth = Math.min(width, 1100);
  const [demoCreatorId, setDemoCreatorId] = useState<string>(DEFAULT_DEMO_CREATOR);
  const signupHref = buildCreatorSignupHref();

  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.root}>
      <LandingWebglBackdrop />
      {Platform.OS === "web" ? (
        <View
          style={[styles.scanlines, { pointerEvents: "none" }]}
          className="techno-scanlines-overlay"
        />
      ) : null}

      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={Platform.OS === "web"}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.page, { maxWidth: contentMaxWidth }]}>
            <View style={styles.topBar}>
              <Text style={styles.logo}>UR PLATFORM</Text>
              <View style={styles.topLinks}>
                <LandingAppDownloadLink variant="top" />
                <LandingSignInButton variant="top" />
              </View>
            </View>

            <Text style={styles.kicker}>18+ ONLY · ID + SELFIE REQUIRED TO ENTER</Text>
            <Text style={styles.headline}>
              {display}
              {!done ? <Text style={styles.cursor}>|</Text> : null}
            </Text>
            <Text style={styles.lede}>
              {LANDING_PLATFORM_UNITY_LINE} UR Platform is for adults. You must photograph a
              government ID (front and back) and a matching selfie before you can enter the app,
              website product, or AI demo. This exists because AI, social, and paid features can
              be addictive under 18.
            </Text>

            <View style={styles.heroCtaRow}>
              <LandingSignInButton variant="hero" />
              <Link href={signupHref as never} asChild>
                <Pressable style={styles.heroCta} accessibilityRole="link">
                  <Text style={styles.heroCtaText}>Create account →</Text>
                </Pressable>
              </Link>
              <LandingAppDownloadLink variant="hero" />
            </View>

            <LandingPromoBanner />

            <LandingAiCategoryHub
              selectedCreatorId={demoCreatorId}
              onSelectCreator={setDemoCreatorId}
            />

            <LandingDemoChat creatorId={demoCreatorId} onCreatorIdChange={setDemoCreatorId} />
            <LandingBentoGrid isWide={isWide} />
            <LandingTownHallCarousel />
            <LandingSocialProof />
            <LandingCheckoutCta />

            <View style={styles.footer}>
              <LandingAppDownloadLink variant="footer" />
              <Link href="/login" asChild>
                <Pressable accessibilityRole="link">
                  <Text style={styles.link}>Already have an account? Sign in</Text>
                </Pressable>
              </Link>
              <Text style={styles.disclosure}>{PLATFORM_DISCLOSURE_SHORT}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scanlines: { ...StyleSheet.absoluteFillObject, opacity: 0.35, zIndex: 0 },
  safe: { flex: 1, zIndex: 2 },
  scrollView: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 48 },
  page: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    width: "100%",
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
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  signInBtnText: { color: T.electric, fontWeight: "800", fontSize: 13 },
  kicker: {
    color: T.electricDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
    width: "100%",
  },
  headline: {
    color: T.text,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 44,
    letterSpacing: -0.5,
    marginBottom: 14,
    width: "100%",
  },
  cursor: { color: T.electric, fontWeight: "300" },
  lede: {
    color: T.muted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    maxWidth: 640,
    width: "100%",
  },
  heroCtaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
    alignItems: "center",
    width: "100%",
  },
  heroSignIn: {
    borderWidth: 1,
    borderColor: T.electric,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  heroSignInText: { color: T.electric, fontWeight: "800", fontSize: 15 },
  heroCta: {
    backgroundColor: T.electric,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  heroCtaText: { color: "#001018", fontWeight: "800", fontSize: 15 },
  footer: { alignItems: "center", paddingTop: 8, gap: 16, width: "100%" },
  disclosure: {
    color: T.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    maxWidth: 520,
  },
});
