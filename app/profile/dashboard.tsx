import { Stack } from "expo-router";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ProfileStackScreen } from "@/components/profile-stack-screen";
import { LoyaltyTrackingPanel } from "@/components/loyalty-tracking-panel";
import { ThanksStampsPanel } from "@/components/thanks-stamps-panel";
import { CustomLinkCard } from "@/components/transaction-history-list";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { usePlatformOwner } from "@/lib/use-platform-owner";

function StatTile({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 14,
        gap: 4,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

export default function ProfileDashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { canAccessAdminDashboard } = usePlatformOwner();
  const loyalty = trpc.loyalty.getStatus.useQuery();
  const txs = trpc.partnerDashboard.myTransactions.useQuery({ limit: 5 });
  const myLink = trpc.partnerDashboard.myCustomLink.useQuery();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileStackScreen
        title="Dashboard"
        subtitle="Your activity snapshot on UR Platform."
        icon="📋"
      >
        {loyalty.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : loyalty.data ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatTile label="Loyalty points" value={loyalty.data.totalPoints.toLocaleString()} />
            <StatTile label="Sign-in streak" value={`${loyalty.data.currentStreakDays}d`} />
            <StatTile label="Total sign-ins" value={String(loyalty.data.totalSignIns)} />
          </View>
        ) : null}

        {txs.data ? (
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 14,
              gap: 6,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>Spending summary</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {txs.data.stats.totalTransactions} transactions · $
              {(txs.data.stats.totalVolumeCents / 100).toFixed(2)} total volume
            </Text>
          </View>
        ) : null}

        {myLink.data ? (
          <CustomLinkCard
            customUrl={myLink.data.customUrl}
            slug={myLink.data.slug}
            label="Your UR link"
          />
        ) : null}

        <LoyaltyTrackingPanel />

        <ThanksStampsPanel />

        <Pressable
          onPress={() => router.push("/profile/analytics")}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 14,
          }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>View full analytics →</Text>
        </Pressable>

        {!canAccessAdminDashboard ? (
          <Pressable
            onPress={() => router.push("/creator-dashboard")}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 14,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>Creator dashboard →</Text>
          </Pressable>
        ) : null}
      </ProfileStackScreen>
    </>
  );
}
