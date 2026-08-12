import { Stack } from "expo-router";
import { View, Text, ActivityIndicator } from "react-native";
import { ProfileStackScreen } from "@/components/profile-stack-screen";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ProfileAnalyticsScreen() {
  const colors = useColors();
  const status = trpc.loyalty.getStatus.useQuery();
  const dashboard = trpc.loyalty.getDashboard.useQuery();
  const txs = trpc.partnerDashboard.myTransactions.useQuery({ limit: 20 });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileStackScreen
        title="Analytics"
        subtitle="Loyalty, engagement, and purchase activity."
        icon="📊"
      >
        {status.isLoading || dashboard.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                padding: 16,
                gap: 10,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
                Loyalty
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Points earned: {status.data?.totalPointsEarned.toLocaleString() ?? "0"} · Spent:{" "}
                {status.data?.totalPointsSpent.toLocaleString() ?? "0"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Longest streak: {status.data?.longestStreakDays ?? 0} days · Current:{" "}
                {status.data?.currentStreakDays ?? 0} days
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Milestones claimed: {status.data?.milestonesClaimed.length ?? 0}
              </Text>
            </View>

            {dashboard.data?.recentEvents?.length ? (
              <View
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  padding: 16,
                  gap: 8,
                }}
              >
                <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
                  Recent loyalty events
                </Text>
                {dashboard.data.recentEvents.slice(0, 8).map((ev) => (
                  <Text key={ev.id} style={{ color: colors.muted, fontSize: 12 }}>
                    {ev.type.replace(/_/g, " ")} · {ev.pointsDelta >= 0 ? "+" : ""}
                    {ev.pointsDelta} pts
                  </Text>
                ))}
              </View>
            ) : null}

            {txs.data ? (
              <View
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  padding: 16,
                  gap: 8,
                }}
              >
                <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
                  Purchases
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {txs.data.stats.totalTransactions} transactions · $
                  {(txs.data.stats.totalVolumeCents / 100).toFixed(2)} lifetime volume
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ProfileStackScreen>
    </>
  );
}
