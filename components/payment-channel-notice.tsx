import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  PAYMENT_CHANNEL_POLICY_HEADLINE,
  PAYMENT_CHANNEL_POLICY_SUMMARY,
  AI_SUBSCRIPTION_PRICING_SUMMARY,
  AI_TALK_PRICING_SUMMARY,
  CARTOON_STUDIO_CHANNEL_SUMMARY,
} from "@/lib/payment-channel-policy";
import { DEV_SIMULATED_COMMERCE_NOTICE } from "@/lib/dev-commerce-mode";

type Props = {
  compact?: boolean;
  /** Show dev simulated-checkout banner (non-production). */
  showDevCommerce?: boolean;
};

/** Visible on every purchase surface so users understand app vs web checkout rules. */
export function PaymentChannelNotice({ compact = false, showDevCommerce = __DEV__ }: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.box,
        compact && styles.boxCompact,
        { borderColor: colors.border, backgroundColor: colors.background },
      ]}
    >
      <Text style={[styles.headline, { color: colors.foreground }]}>
        {PAYMENT_CHANNEL_POLICY_HEADLINE}
      </Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        {PAYMENT_CHANNEL_POLICY_SUMMARY}
      </Text>
      {showDevCommerce ? (
        <Text style={[styles.devNote, { color: colors.primary }]}>
          {DEV_SIMULATED_COMMERCE_NOTICE}
        </Text>
      ) : null}
      {!compact ? (
        <>
          <Text style={[styles.priceLine, { color: colors.muted }]}>{AI_SUBSCRIPTION_PRICING_SUMMARY}</Text>
          <Text style={[styles.priceLine, { color: colors.muted }]}>{AI_TALK_PRICING_SUMMARY}</Text>
          <Text style={[styles.priceLine, { color: colors.muted }]}>{CARTOON_STUDIO_CHANNEL_SUMMARY}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  boxCompact: {
    padding: 10,
    marginBottom: 8,
  },
  headline: {
    fontSize: 13,
    fontWeight: "800",
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
  },
  priceLine: {
    fontSize: 11,
    lineHeight: 16,
  },
  devNote: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
});
