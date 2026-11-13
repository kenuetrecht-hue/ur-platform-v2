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
import { AFTER_ID_PASS_HREF } from "@/lib/after-sign-in";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useStableWindowWidth } from "@/hooks/use-stable-window-width";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { LANDING_PLATFORM_UNITY_LINE } from "@/lib/landing-platform-copy";
import { LandingWhatWeOffer } from "@/components/landing/landing-what-we-offer";
import { LandingWebglBackdrop } from "@/components/landing/landing-webgl-backdrop";
import { LandingBentoGrid } from "@/components/landing/landing-bento-grid";
import { LandingDemoChat } from "@/components/landing/landing-demo-chat";
import { LandingTownHallCarousel } from "@/components/landing/landing-town-hall-carousel";
import { LandingSocialProof } from "@/components/landing/landing-social-proof";
import { LandingCheckoutCta } from "@/components/landing/landing-checkout-cta";
import { LandingDeviceDownloadLinks } from "@/components/landing/landing-app-download-link";
import { LandingPromoBanner } from "@/components/landing/landing-promo-banner";
import { LandingAiCategoryHub } from "@/components/landing/landing-ai-category-hub";
import { LANDING_DEMO_CREATOR_IDS } from "@/lib/landing-demo-policy";
import { PLATFORM_DISCLOSURE_SHORT } from "@/lib/platform-disclosure-copy";
import { PUBLIC_LEGAL_NAV } from "@/lib/public-legal-routes";
import { AgeVerifyUpfrontNotice } from "@/components/age-verify-upfront-notice";
import { HomepageSignIn } from "@/components/homepage-sign-in";

const HEADLINE = "Join UR. One website, one app, one login.";

const DEFAULT_DEMO_CREATOR = LANDING_DEMO_CREATOR_IDS[0];

const LANDING_PAGE_TABS = [
  { id: "signup", label: "Sign up" },
  { id: "login", label: "Login" },
  { id: "offers", label: "Offers" },
  { id: "ais", label: "AIs" },
  { id: "examples", label: "Examples" },
  { id: "community", label: "Community" },
  { id: "price", label: "Price" },
  { id: "download", label: "Download" },
] as const;

type LandingPageTabId = (typeof LANDING_PAGE_TABS)[number]["id"];

export function TechnoFuturistExperience() {
  const width = useStableWindowWidth();
  const { isAuthenticated, isLoading } = useAuth();
  const { display, done } = useTypewriter(HEADLINE, 32, 500);
  const isWide = width >= 900;
  const contentMaxWidth = Math.min(width, 1100);
  const [demoCreatorId, setDemoCreatorId] = useState<string>(DEFAULT_DEMO_CREATOR);
  const [pageTab, setPageTab] = useState<LandingPageTabId>("signup");

  if (!isLoading && isAuthenticated) {
    return <Redirect href={AFTER_ID_PASS_HREF} />;
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
                <Pressable
                  onPress={() => setPageTab("signup")}
                  style={pageTab === "signup" ? styles.signUpBtn : styles.signInBtn}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: pageTab === "signup" }}
                >
                  <Text style={pageTab === "signup" ? styles.signUpBtnText : styles.signInBtnText}>Sign up</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPageTab("login")}
                  style={pageTab === "login" ? styles.signUpBtn : styles.signInBtn}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: pageTab === "login" }}
                >
                  <Text style={pageTab === "login" ? styles.signUpBtnText : styles.signInBtnText}>Login</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPageTab("download")}
                  style={styles.signInBtn}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: pageTab === "download" }}
                >
                  <Text style={styles.signInBtnText}>Download</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.kicker}>18+ ONLY · ID + SELFIE REQUIRED TO ENTER</Text>
            <Text style={styles.headline}>
              {display}
              {!done ? <Text style={styles.cursor}>|</Text> : null}
            </Text>
            <Text style={styles.lede}>
              {LANDING_PLATFORM_UNITY_LINE} For adults 18 and older. Pick a tab to see that part.
            </Text>

            <View style={styles.tabRow} accessibilityRole="tablist">
              {LANDING_PAGE_TABS.map((tab) => {
                const active = pageTab === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setPageTab(tab.id)}
                    style={[styles.tab, active ? styles.tabActive : null]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    testID={`landing-page-tab-${tab.id}`}
                  >
                    <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.panel} testID={`landing-page-panel-${pageTab}`}>
              {pageTab === "signup" ? (
                <>
                  <LandingPromoBanner />
                  <AgeVerifyUpfrontNotice />
                  <Text style={styles.tabHint}>Already have an account? Open the Login tab.</Text>
                </>
              ) : null}

              {pageTab === "login" ? (
                <>
                  <Text style={styles.tabHint}>New here? Open the Sign up tab.</Text>
                  <HomepageSignIn />
                </>
              ) : null}

              {pageTab === "offers" ? <LandingWhatWeOffer /> : null}

              {pageTab === "ais" ? (
                <>
                  <LandingAiCategoryHub
                    selectedCreatorId={demoCreatorId}
                    onSelectCreator={setDemoCreatorId}
                  />
                  <LandingDemoChat creatorId={demoCreatorId} onCreatorIdChange={setDemoCreatorId} />
                </>
              ) : null}

              {pageTab === "examples" ? <LandingBentoGrid isWide={isWide} /> : null}

              {pageTab === "community" ? (
                <>
                  <LandingTownHallCarousel />
                  <LandingSocialProof />
                </>
              ) : null}

              {pageTab === "price" ? <LandingCheckoutCta /> : null}

              {pageTab === "download" ? (
                <View style={styles.downloadPanel}>
                  <Text style={styles.downloadTitle}>Get the app</Text>
                  <Text style={styles.downloadLede}>
                    Pick your phone or computer. Each button is on its own line.
                  </Text>
                  <LandingDeviceDownloadLinks variant="hero" />
                </View>
              ) : null}
            </View>

            <View style={styles.footer}>
              <Pressable onPress={() => setPageTab("login")} accessibilityRole="tab">
                <Text style={styles.link}>Login</Text>
              </Pressable>
              <View style={styles.legalRow}>
                {PUBLIC_LEGAL_NAV.map((item) => (
                  <Link key={item.href} href={item.href} asChild>
                    <Pressable accessibilityRole="link">
                      <Text style={styles.link}>{item.label}</Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
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
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
    width: "100%",
  },
  logo: { color: T.electric, fontWeight: "900", letterSpacing: 2, fontSize: 13 },
  topLinks: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" },
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
  signUpBtn: {
    backgroundColor: T.electric,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  signUpBtnText: { color: T.bg, fontWeight: "800", fontSize: 13 },
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
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    marginBottom: 18,
  },
  tab: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: T.bgElevated,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  tabActive: {
    borderColor: T.electric,
    backgroundColor: "rgba(0, 212, 255, 0.16)",
  },
  tabLabel: { color: T.muted, fontWeight: "800", fontSize: 14 },
  tabLabelActive: { color: T.text },
  panel: { width: "100%", gap: 16, marginBottom: 28 },
  downloadPanel: { width: "100%", gap: 12 },
  downloadTitle: { color: T.text, fontSize: 22, fontWeight: "900" },
  downloadLede: { color: T.muted, fontSize: 15, lineHeight: 22, marginBottom: 4 },
  tabHint: { color: T.muted, fontSize: 14, lineHeight: 20 },
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
  legalRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16 },
  disclosure: {
    color: T.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    maxWidth: 520,
  },
});
