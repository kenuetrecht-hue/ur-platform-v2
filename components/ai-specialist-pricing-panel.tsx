import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { AiSubscriptionPanel } from "@/components/ai-subscription-panel";
import { AiTalkTimePanel } from "@/components/ai-talk-time-panel";
import { PaymentChannelNotice } from "@/components/payment-channel-notice";
import { PricingComingSoonPanel } from "@/components/pricing-coming-soon-panel";
import { SpecialistAddonsPricingSection, SpecialistTextPricingCard } from "@/components/specialist-addons-pricing-section";
import { PlatformTermsPanel } from "@/components/platform-terms-panel";
import { TERMS_CHECKOUT_ACKNOWLEDGMENT } from "@/lib/platform-terms-of-use";
import { AI_SUBSCRIPTION_PRICING_SUMMARY } from "@/lib/payment-channel-policy";
import { AI_TALK_EXPIRY_PURCHASE_DISCLOSURE } from "@/lib/ai-talk-time-policy";
import { PUBLIC_PRICING_ENABLED } from "@/lib/pricing-visibility";

type Props = {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
};

/** Per-specialist pricing — text plans + voice talk time for this AI only. */
export function AiSpecialistPricingPanel({
  creatorId,
  creatorName,
  creatorAvatar = "✨",
}: Props) {
  const colors = useColors();

  if (!PUBLIC_PRICING_ENABLED) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PricingComingSoonPanel contextLabel={`${creatorName} — specialist access`} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={styles.avatar}>{creatorAvatar}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>{creatorName}</Text>
          <Text style={[styles.heroSub, { color: colors.muted }]}>
            Pricing for this specialist only — separate from every other AI on the platform.
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTag, { color: colors.primary }]}>TEXT ACCESS</Text>
      <Text style={[styles.sectionHint, { color: colors.muted }]}>
        {AI_SUBSCRIPTION_PRICING_SUMMARY} Every plan shows exactly how many messages you receive.
      </Text>
      <SpecialistTextPricingCard creatorId={creatorId} />
      <AiSubscriptionPanel creatorId={creatorId} creatorName={creatorName} mode="pricing" />

      <SpecialistAddonsPricingSection creatorId={creatorId} creatorName={creatorName} />

      <Text style={[styles.sectionTag, { color: colors.primary, marginTop: 8 }]}>TERMS OF USE</Text>
      <Text style={[styles.sectionHint, { color: colors.muted }]}>
        {TERMS_CHECKOUT_ACKNOWLEDGMENT}
      </Text>
      <PlatformTermsPanel compact showCheckoutAck />

      <Text style={[styles.sectionTag, { color: colors.primary, marginTop: 8 }]}>VOICE TALK-BACK</Text>
      <Text style={[styles.sectionHint, { color: colors.muted }]}>
        Hear {creatorName} speak — metered to the millisecond. {AI_TALK_EXPIRY_PURCHASE_DISCLOSURE}
      </Text>
      <AiTalkTimePanel creatorName={creatorName} showPurchase />

      <PaymentChannelNotice />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 8, paddingBottom: 24, gap: 4 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  avatar: { fontSize: 32 },
  heroTitle: { fontSize: 18, fontWeight: "900" },
  heroSub: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginHorizontal: 6,
    marginTop: 4,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 6,
    marginBottom: 6,
  },
});
