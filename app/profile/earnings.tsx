import { Stack } from "expo-router";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ProfileStackScreen } from "@/components/profile-stack-screen";
import { TransactionHistoryList } from "@/components/transaction-history-list";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { usePlatformOwner } from "@/lib/use-platform-owner";

export default function ProfileEarningsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { canAccessAdminDashboard } = usePlatformOwner();
  const txs = trpc.partnerDashboard.myTransactions.useQuery({ limit: 50 });
  const creatorDash = trpc.partnerDashboard.creatorDashboard.useQuery(undefined, {
    enabled: !canAccessAdminDashboard,
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileStackScreen
        title="Earnings"
        subtitle="Your transactions and creator or affiliate payouts."
        icon="💰"
      >
        {txs.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : txs.data ? (
          <>
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                padding: 16,
                gap: 6,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
                Summary
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {txs.data.stats.totalTransactions} transactions · $
                {(txs.data.stats.totalVolumeCents / 100).toFixed(2)} total volume
              </Text>
              {creatorDash.data?.analytics ? (
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  Creator earnings: $
                  {(creatorDash.data.analytics.totalEarningsCents / 100).toFixed(2)}
                </Text>
              ) : null}
            </View>

            <TransactionHistoryList
              transactions={txs.data.transactions}
              emptyMessage="No transactions yet."
            />

            {!canAccessAdminDashboard ? (
              <>
                <Pressable
                  onPress={() => router.push("/creator-dashboard")}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}10`,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    Open Creator Dashboard →
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/affiliate-dashboard")}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                    Open Affiliate Dashboard →
                  </Text>
                </Pressable>
              </>
            ) : null}
          </>
        ) : null}
      </ProfileStackScreen>
    </>
  );
}
