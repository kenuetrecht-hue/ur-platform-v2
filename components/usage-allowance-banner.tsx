import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { formatAllowanceHeadline } from "@/lib/pricing-transparency";
import { PurchaseUsageTracker } from "@/components/purchase-usage-tracker";

type Props = {
  creatorId: string;
  creatorName: string;
};

/** Shows remaining text messages + plain-language plan summary at top of chat. */
export function UsageAllowanceBanner({ creatorId, creatorName }: Props) {
  const colors = useColors();
  const { isAuthenticated } = useAuth();

  const access = trpc.aiSubscription.getAccess.useQuery(
    { creatorId },
    { enabled: isAuthenticated },
  );

  if (!isAuthenticated || !access.data) return null;

  const usage = access.data.usage;
  const sub = access.data.subscription;

  if (access.data.hasAccess && !sub && access.data.source !== "ai_subscription") {
    return (
      <View style={[styles.box, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
          ✓ Platform access active — {creatorName}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4, lineHeight: 14 }}>
          Heavy features (images, code runs, voice) still use separate credits with clear caps.
        </Text>
      </View>
    );
  }

  if (!sub && !usage?.messagesRemaining) {
    return (
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
          Subscribe to chat with {creatorName}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4, lineHeight: 15 }}>
          From $7.99/day = 35 messages · $15.99/week = 130 messages · $24.99/month = 350 messages.
          Open the Pricing tab for full pay/receive details.
        </Text>
      </View>
    );
  }

  if (!usage) return null;

  return (
    <View>
      <PurchaseUsageTracker
        title="Text pass"
        used={usage.messagesUsed}
        included={usage.messagesIncluded}
        remaining={usage.messagesRemaining}
        unit="messages"
        loseByLabel={
          sub
            ? `${sub.plan} plan · ${formatAllowanceHeadline(creatorId, sub.plan)} · Learn = 5 msgs · Hive = 3 msgs`
            : undefined
        }
        compact
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    marginHorizontal: 4,
  },
});
