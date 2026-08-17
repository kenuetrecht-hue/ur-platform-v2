import { View, Text, StyleSheet, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { PlainProductPricing } from "@/lib/pricing-transparency";

type Props = {
  product: PlainProductPricing;
  /** Highlight one plan period */
  highlightPeriod?: "day" | "week" | "month";
  onSelectPlan?: (period: "day" | "week" | "month") => void;
  compact?: boolean;
};

/** Plain "You pay → You receive" block for one product. */
export function PlainPricingProductCard({
  product,
  highlightPeriod,
  onSelectPlan,
  compact = false,
}: Props) {
  const colors = useColors();

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: compact ? 14 : 15 }}>
        {product.feature}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
        {product.category}
        {product.dailyHardCap ? ` · Max ${product.dailyHardCap} ${product.unit}/day` : ""}
      </Text>

      <View style={{ marginTop: 10, gap: 8 }}>
        {product.plans.map((plan) => {
          const active = highlightPeriod === plan.period;
          const inner = (
            <>
              <View style={styles.planHeader}>
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 16 }}>
                  {plan.priceDisplay}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{plan.periodLabel}</Text>
              </View>
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12, marginTop: 4 }}>
                You receive: {plan.included > 0 ? `${plan.included} ${plan.unit}` : plan.payReceiveLine.split("→")[1]?.trim()}
              </Text>
              {plan.included > 0 ? (
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2, lineHeight: 16 }}>
                  {plan.payReceiveLine}
                </Text>
              ) : null}
              {plan.dailyCapNote ? (
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4, lineHeight: 14 }}>
                  {plan.dailyCapNote}
                </Text>
              ) : null}
            </>
          );

          if (onSelectPlan) {
            return (
              <Pressable
                key={plan.period}
                onPress={() => onSelectPlan(plan.period)}
                style={[
                  styles.planRow,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? `${colors.primary}12` : colors.background,
                  },
                ]}
              >
                {inner}
              </Pressable>
            );
          }

          return (
            <View
              key={plan.period}
              style={[
                styles.planRow,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? `${colors.primary}12` : colors.background,
                },
              ]}
            >
              {inner}
            </View>
          );
        })}
      </View>

      {product.addons && product.addons.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700", marginBottom: 6 }}>
            TOP-UPS (pay only for what you need)
          </Text>
          {product.addons.map((addon) => (
            <Text key={addon.label} style={{ color: colors.foreground, fontSize: 11, marginBottom: 4 }}>
              • {addon.payReceiveLine}
            </Text>
          ))}
        </View>
      ) : null}

      {product.notIncludedNote ? (
        <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 10 }}>
          Note: {product.notIncludedNote}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  planRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
