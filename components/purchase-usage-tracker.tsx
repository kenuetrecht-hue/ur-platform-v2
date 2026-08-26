import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  USAGE_TRACKER_HEADLINE,
  formatUsedLeftLine,
  type UsageLotTrackerView,
} from "@/lib/usage-lot-tracker";

type Props = {
  title: string;
  used: number;
  included: number;
  remaining: number;
  unit: string;
  loseByLabel?: string;
  lots?: UsageLotTrackerView[];
  dailyNote?: string;
  lowBalance?: boolean;
  compact?: boolean;
};

export function PurchaseUsageTracker({
  title,
  used,
  included,
  remaining,
  unit,
  loseByLabel,
  lots,
  dailyNote,
  lowBalance,
  compact = false,
}: Props) {
  const colors = useColors();
  if (included <= 0 && (!lots || lots.length === 0)) return null;

  const usedLeft = formatUsedLeftLine({ used, included, remaining, unit });

  if (compact) {
    return (
      <View style={[styles.compact, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 12 }}>{title}</Text>
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12, marginTop: 3 }}>
          {usedLeft}
        </Text>
        {loseByLabel ? (
          <Text style={{ color: colors.muted, fontSize: 10, marginTop: 3, lineHeight: 14 }}>
            {loseByLabel}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.box, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}>
      <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>
        {USAGE_TRACKER_HEADLINE}
      </Text>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 14, marginTop: 6 }}>
        {title}
      </Text>
      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13, marginTop: 4 }}>
        {usedLeft}
      </Text>
      {dailyNote ? (
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 15 }}>
          {dailyNote}
        </Text>
      ) : null}
      {loseByLabel ? (
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
          {loseByLabel}
        </Text>
      ) : null}
      {lowBalance ? (
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 11, marginTop: 6 }}>
          Running low — re-up before you run out.
        </Text>
      ) : null}
      {(lots ?? []).map((lot) => (
        <View
          key={lot.id}
          style={[styles.lot, { borderColor: colors.border, backgroundColor: colors.background }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
            {lot.productLabel}
          </Text>
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13, marginTop: 3 }}>
            {formatUsedLeftLine({
              used: lot.used,
              included: lot.included,
              remaining: lot.remaining,
              unit: lot.unit,
            })}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 15 }}>
            {lot.loseByLabel}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  compact: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  lot: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
});
