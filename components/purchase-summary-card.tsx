import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { PurchaseSummary } from "@/lib/pricing-disclosures";
import { BrandGradient } from "@/components/brand-gradient";
import { brandPaySurface, withAlpha } from "@/lib/brand-theme";

type Props = {
  summary: PurchaseSummary;
};

export function PurchaseSummaryCard({ summary }: Props) {
  const colors = useColors();
  const paySurface = brandPaySurface(colors);

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: withAlpha(colors.secondary, 0.18),
          backgroundColor: colors.surface,
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{summary.title}</Text>

      <Text style={[styles.heading, { color: colors.foreground }]}>What you pay</Text>
      {summary.priceBreakdown.map((line) => (
        <View key={line.label} style={styles.priceRow}>
          <Text
            style={{
              color: line.emphasis ? colors.foreground : colors.muted,
              fontSize: line.emphasis ? 13 : 12,
              fontWeight: line.emphasis ? "700" : "500",
              flex: 1,
            }}
          >
            {line.label}
          </Text>
          <Text
            style={{
              color: line.emphasis ? colors.secondary : colors.foreground,
              fontSize: line.emphasis ? 15 : 12,
              fontWeight: line.emphasis ? "800" : "600",
            }}
          >
            {line.value.includes("—") ? line.value.split(" — ")[0] : line.value}
          </Text>
        </View>
      ))}
      {summary.priceBreakdown.find((l) => l.label === "Stripe processing fee") ? (
        <Text style={{ color: colors.muted, fontSize: 9, lineHeight: 13, marginBottom: 8 }}>
          {summary.pricing.stripeFeeExplanation}
        </Text>
      ) : null}
      {summary.pricing.stateName && summary.pricing.stateTaxNotes ? (
        <Text style={{ color: colors.muted, fontSize: 9, lineHeight: 13, marginBottom: 8 }}>
          {summary.pricing.stateTaxNotes}
        </Text>
      ) : null}

      <BrandGradient variant="pay" style={[styles.payRow, paySurface]}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{summary.youPay.label}</Text>
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 18 }}>
          {summary.pricing.totalDisplay}
        </Text>
      </BrandGradient>

      <Text style={[styles.heading, { color: colors.foreground }]}>What you receive</Text>
      {summary.youReceive.map((line) => (
        <View key={line.label} style={styles.lineRow}>
          <Text style={[styles.bullet, { color: colors.secondary }]}>✓</Text>
          <View style={styles.lineBody}>
            <Text
              style={{
                color: colors.foreground,
                fontWeight: line.emphasis ? "700" : "600",
                fontSize: 12,
              }}
            >
              {line.label}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 1 }}>
              {line.value}
            </Text>
          </View>
        </View>
      ))}

      <Text style={[styles.heading, { color: colors.foreground, marginTop: 10 }]}>Not included</Text>
      {summary.notIncluded.map((item) => (
        <View key={item} style={styles.lineRow}>
          <Text style={[styles.bullet, { color: colors.muted }]}>—</Text>
          <Text style={{ color: colors.muted, fontSize: 11, flex: 1, lineHeight: 16 }}>{item}</Text>
        </View>
      ))}

      {summary.importantNotes.length > 0 ? (
        <>
          <Text style={[styles.heading, { color: colors.foreground, marginTop: 10 }]}>Good to know</Text>
          {summary.importantNotes.map((note) => (
            <Text key={note} style={{ color: colors.muted, fontSize: 10, lineHeight: 15, marginBottom: 4 }}>
              • {note}
            </Text>
          ))}
        </>
      ) : null}

      <Text style={[styles.disclosure, { color: colors.muted, borderTopColor: withAlpha(colors.secondary, 0.15) }]}>
        {summary.aiDisclosure} Billed by {summary.billingEntity}.
      </Text>
      <Text style={[styles.termsNote, { color: colors.muted }]}>
        AI & digital access: no refunds. Harassment = revoked privileges, no refund. Creator purchases: UR LLC not
        responsible — see Profile → Terms of Use.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  sectionTitle: {
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 8,
  },
  payRow: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heading: {
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 6,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 6,
  },
  bullet: {
    fontSize: 12,
    width: 14,
    marginTop: 1,
  },
  lineBody: {
    flex: 1,
  },
  disclosure: {
    fontSize: 9,
    lineHeight: 14,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  termsNote: {
    fontSize: 9,
    lineHeight: 14,
    marginTop: 8,
    fontWeight: "600",
  },
});
