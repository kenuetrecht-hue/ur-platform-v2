import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { PurchaseUsageTracker } from "@/components/purchase-usage-tracker";
import { USAGE_TRACKER_HEADLINE } from "@/lib/usage-lot-tracker";

type Props = {
  creatorId?: string;
  compact?: boolean;
};

/** Shows used vs left for every product this user has purchased. */
export function UsageTrackerDashboard({ creatorId, compact = false }: Props) {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const tracker = trpc.usageCredits.getMyTracker.useQuery(
    { creatorId },
    { enabled: isAuthenticated },
  );

  if (!isAuthenticated || tracker.isLoading) return null;

  const items = tracker.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: compact ? 13 : 15 }}>
        Your usage tracker
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
        {tracker.data?.headline ?? USAGE_TRACKER_HEADLINE}
      </Text>
      {items.map((item) => (
        <PurchaseUsageTracker
          key={item.id}
          title={item.title}
          used={item.lots[0]?.used ?? 0}
          included={item.lots.reduce((sum, lot) => sum + lot.included, 0) || item.lots[0]?.included || 0}
          remaining={item.lots.reduce((sum, lot) => sum + lot.remaining, 0)}
          unit={item.lots[0]?.unit ?? "credits"}
          loseByLabel={item.loseByLabel}
          lots={compact ? undefined : item.lots}
          lowBalance={item.lowBalance}
          compact={compact}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
});
