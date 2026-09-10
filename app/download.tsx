import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PwaInstallControls } from "@/components/pwa-install-controls";
import {
  APP_DOWNLOAD_HEADLINE,
  APP_DOWNLOAD_LEDE,
  APP_DOWNLOAD_NO_STORE_LINE,
} from "@/lib/app-download";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { PLATFORM_DISCLOSURE_SHORT } from "@/lib/platform-disclosure-copy";
import { PUBLIC_LEGAL_NAV } from "@/lib/public-legal-routes";

export default function DownloadScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.page}>
            <Link href="/welcome" asChild>
              <Pressable accessibilityRole="link">
                <Text style={styles.back}>← Back to homepage</Text>
              </Pressable>
            </Link>

            <Text style={styles.kicker}>INSTALL FROM THIS WEBSITE</Text>
            <Text style={styles.headline}>{APP_DOWNLOAD_HEADLINE}</Text>
            <Text style={styles.lede}>{APP_DOWNLOAD_LEDE}</Text>
            <Text style={styles.storeFree}>{APP_DOWNLOAD_NO_STORE_LINE}</Text>

            <PwaInstallControls />

            <View style={styles.footer}>
              <Link href="/login" asChild>
                <Pressable accessibilityRole="link">
                  <Text style={styles.link}>Already have an account? Sign in</Text>
                </Pressable>
              </Link>
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
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 48 },
  page: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  back: { color: T.muted, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  kicker: {
    color: T.electricDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  headline: {
    color: T.text,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  lede: { color: T.muted, fontSize: 16, lineHeight: 24 },
  storeFree: {
    color: T.gold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 8,
  },
  footer: { alignItems: "center", paddingTop: 16, gap: 16 },
  legalRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16 },
  link: { color: T.electric, fontWeight: "700", fontSize: 14 },
  disclosure: {
    color: T.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    maxWidth: 520,
  },
});
