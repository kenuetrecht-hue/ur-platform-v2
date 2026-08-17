import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  PRICING_COMING_SOON_BODY,
  PRICING_COMING_SOON_HEADLINE,
} from "@/lib/pricing-visibility";

type Props = {
  compact?: boolean;
  contextLabel?: string;
};

export function PricingComingSoonPanel({ compact = false, contextLabel }: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.wrap,
        compact ? styles.compact : null,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{PRICING_COMING_SOON_HEADLINE}</Text>
      {contextLabel ? (
        <Text style={[styles.context, { color: colors.primary }]}>{contextLabel}</Text>
      ) : null}
      <Text style={[styles.body, { color: colors.muted }]}>{PRICING_COMING_SOON_BODY}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    marginVertical: 4,
  },
  compact: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  context: {
    fontSize: 12,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
});
