import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import {
  TERMS_BILLING_ENTITY,
  TERMS_SUPPORT_EMAIL,
} from "@/lib/platform-terms-of-use";
import type { TermsSection } from "@/lib/platform-terms-of-use";
import { PUBLIC_LEGAL_NAV } from "@/lib/public-legal-routes";

type Props = {
  kicker: string;
  title: string;
  lede: string;
  effectiveDate: string;
  sections: TermsSection[];
};

/** Public Terms / Privacy / Refunds — no login required. */
export function PublicLegalScreen({ kicker, title, lede, effectiveDate, sections }: Props) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.page}>
            <Link href="/welcome" asChild>
              <Pressable accessibilityRole="link">
                <Text style={styles.back}>Back to homepage</Text>
              </Pressable>
            </Link>

            <Text style={styles.kicker}>{kicker}</Text>
            <Text style={styles.headline}>{title}</Text>
            <Text style={styles.meta}>
              Effective {effectiveDate} · {TERMS_BILLING_ENTITY}
            </Text>
            <Text style={styles.lede}>{lede}</Text>

            {sections.map((section) => (
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.bullets.map((bullet) => (
                  <Text key={bullet.slice(0, 64)} style={styles.bullet}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ))}

            <Text style={styles.contact}>Questions: {TERMS_SUPPORT_EMAIL}</Text>

            <View style={styles.links}>
              {PUBLIC_LEGAL_NAV.map((item) => (
                <Link key={item.href} href={item.href} asChild>
                  <Pressable accessibilityRole="link">
                    <Text style={styles.link}>{item.label}</Text>
                  </Pressable>
                </Link>
              ))}
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
  meta: { color: T.muted, fontSize: 12, lineHeight: 18 },
  lede: { color: T.muted, fontSize: 16, lineHeight: 24, marginBottom: 8 },
  section: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  sectionTitle: { color: T.text, fontWeight: "800", fontSize: 16 },
  bullet: { color: T.muted, fontSize: 14, lineHeight: 21 },
  contact: { color: T.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 16, paddingTop: 8 },
  link: { color: T.electric, fontWeight: "700", fontSize: 14 },
});
