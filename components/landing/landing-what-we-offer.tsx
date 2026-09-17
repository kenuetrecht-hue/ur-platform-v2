import { View, Text, StyleSheet } from "react-native";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import {
  LANDING_WHAT_WE_OFFER,
  LANDING_WHAT_WE_OFFER_LEDE,
  LANDING_WHAT_WE_OFFER_TITLE,
} from "@/lib/landing-platform-copy";

export function LandingWhatWeOffer({ compact }: { compact?: boolean }) {
  return (
    <View
      style={[styles.wrap, compact ? styles.wrapCompact : null]}
      testID="landing-what-we-offer"
    >
      <Text style={[styles.title, compact ? styles.titleCompact : null]}>{LANDING_WHAT_WE_OFFER_TITLE}</Text>
      {compact ? null : <Text style={styles.lede}>{LANDING_WHAT_WE_OFFER_LEDE}</Text>}
      <View style={styles.chips}>
        {LANDING_WHAT_WE_OFFER.map((item) => (
          <View key={item} style={styles.chip}>
            <Text style={styles.chipText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginBottom: 24,
    gap: 10,
  },
  wrapCompact: {
    marginBottom: 8,
    gap: 8,
  },
  title: {
    color: T.text,
    fontSize: 18,
    fontWeight: "800",
  },
  titleCompact: {
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  lede: {
    color: T.muted,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 720,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: T.borderBrand,
    backgroundColor: "rgba(79, 70, 229, 0.18)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    color: T.text,
    fontSize: 12,
    fontWeight: "700",
  },
});
