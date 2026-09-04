import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { TransactionHistoryList, CustomLinkCard } from "@/components/transaction-history-list";
import { AffiliateAssociatePanel } from "@/components/affiliate-associate-panel";

export function AffiliateDashboardPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const dash = trpc.partnerDashboard.affiliateDashboard.useQuery();
  const info = trpc.partnerDashboard.programInfo.useQuery();

  const enroll = trpc.partnerDashboard.enrollAffiliate.useMutation({
    onSuccess: () => void utils.partnerDashboard.affiliateDashboard.invalidate(),
  });

  if (dash.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />;
  }

  if (!dash.data?.enrolled) {
    return (
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, margin: 16 }]}>
        <Text style={{ fontSize: 28 }}>🔗</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Affiliate Dashboard</Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
          {info.data?.rule ??
            "Share your UR Platform link and earn $5.00 for every content creator you refer — only after their first 24 free hours, then five later sales. Sales during those first 24 hours do not count. The free day is for people who join in the first 30 days of launch."}
        </Text>
        <Pressable
          onPress={() => enroll.mutate()}
          disabled={enroll.isPending}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          {enroll.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Join affiliate program</Text>
          )}
        </Pressable>
      </View>
    );
  }

  const { profile, referralLink, shareText, referrals, recentTransactions } = dash.data;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      <CustomLinkCard customUrl={referralLink} slug={profile.customSlug} label="Your affiliate link" />
      <View style={[styles.banner, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Affiliate Dashboard</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          {dash.data.payoutRule}
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 12, marginTop: 6 }}>
          {profile.totalReferrals} referrals · {profile.qualifiedReferrals} qualified · $
          {(profile.totalBonusesPaidCents / 100).toFixed(2)} earned
        </Text>
      </View>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800" }}>Your referral link</Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>Code: {profile.referralCode}</Text>
        <Text
          selectable
          style={{
            color: colors.primary,
            fontSize: 12,
            fontFamily: "monospace",
            backgroundColor: colors.background,
            padding: 10,
            borderRadius: 8,
            marginTop: 8,
          }}
        >
          {referralLink}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
          Long-press the link below to copy and share.
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8, lineHeight: 16 }}>{shareText}</Text>
      </View>

      <Text style={{ color: colors.foreground, fontWeight: "700" }}>Referred creators</Text>
      {referrals.length === 0 ? (
        <Text style={{ color: colors.muted }}>No referrals yet — share your link to get started.</Text>
      ) : (
        referrals.map((r) => (
          <View key={r.creatorUserId} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>{r.creatorName}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              {r.creatorEmail}
              {" · "}
              {r.qualifyingTransactionCount}/{dash.data.payoutAfterTransactions} after the free 24 hours
              {r.bonusPaid
                ? " · $5.00 paid"
                : r.transactionsRemaining > 0
                  ? ` · ${r.transactionsRemaining} more qualifying sales`
                  : ""}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
              {r.payoutStatus}
            </Text>
          </View>
        ))
      )}

      <Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 8 }}>Transaction history</Text>
      <TransactionHistoryList transactions={recentTransactions ?? []} />

      <AffiliateAssociatePanel referralLink={referralLink} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: "800" },
  btn: { borderRadius: 10, padding: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});
