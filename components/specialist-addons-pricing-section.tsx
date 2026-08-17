import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  buildCreditProductPlainPricing,
  buildTextSubscriptionPlainPlans,
  getSpecialistAddOnProductIds,
  TEXT_SUB_PLAIN_SUMMARY,
} from "@/lib/pricing-transparency";
import { PlainPricingProductCard } from "@/components/plain-pricing-product-card";
import { UsageUpgradePanel } from "@/components/usage-upgrade-panel";
import type { CreditProductId } from "@/lib/usage-caps-catalog";

type Props = {
  creatorId: string;
  creatorName: string;
  showPurchasePanels?: boolean;
};

/** Per-specialist add-ons with plain pay/receive copy + optional purchase UI. */
export function SpecialistAddonsPricingSection({
  creatorId,
  creatorName,
  showPurchasePanels = true,
}: Props) {
  const colors = useColors();
  const addOnIds = getSpecialistAddOnProductIds(creatorId);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTag, { color: colors.primary }]}>WHAT TEXT INCLUDES & WHAT COSTS EXTRA</Text>
      <View style={[styles.infoBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
          Included with {creatorName} text plan
        </Text>
        {TEXT_SUB_PLAIN_SUMMARY.includedWithText.map((line) => (
          <Text key={line} style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }}>
            ✓ {line}
          </Text>
        ))}
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12, marginTop: 10 }}>
          Sold separately (clear prices below)
        </Text>
        {TEXT_SUB_PLAIN_SUMMARY.soldSeparately.map((line) => (
          <Text key={line} style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }}>
            — {line}
          </Text>
        ))}
      </View>

      <Text style={[styles.sectionTag, { color: colors.primary, marginTop: 8 }]}>ADD-ON PRICING</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: 8, marginHorizontal: 4 }}>
        Every price shows exactly what you pay and how many credits you receive. Upgrade anytime.
      </Text>

      {addOnIds.map((id) => (
        <View key={id}>
          <PlainPricingProductCard product={buildCreditProductPlainPricing(id)} compact />
          {showPurchasePanels ? (
            <UsageUpgradePanel productId={id} creatorId={creatorId} title={`Buy ${buildCreditProductPlainPricing(id).feature}`} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Text subscription plain pricing card (used on pricing tab). */
export function SpecialistTextPricingCard({ creatorId }: { creatorId: string }) {
  const product = buildTextSubscriptionPlainPlans(creatorId);
  return <PlainPricingProductCard product={product} />;
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  sectionTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginHorizontal: 4,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 4,
    marginBottom: 8,
  },
});
