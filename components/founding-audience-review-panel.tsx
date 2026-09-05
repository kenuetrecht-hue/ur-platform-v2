import { useMemo, useState } from "react";
import { View, Text, TextInput, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { CREATOR_AUDIENCE_FOLLOW_RULE } from "@/lib/creator-audience-policy";

function shortId(id: string): string {
  return id.length <= 14 ? id : `${id.slice(0, 12)}…`;
}

/** Owner-only — hard-coded roster of every enrolled content creator and live audience. */
export function FoundingAudienceReviewPanel() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const roster = trpc.partnerDashboard.creatorRoster.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const creators = roster.data?.creators ?? [];
  const creatorCount = roster.data?.creatorCount ?? creators.length;
  const totalFollowers = roster.data?.totalFollowers ?? 0;
  const totalPaid = roster.data?.totalPaidSubscribers ?? 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return creators;
    return creators.filter(
      (row) =>
        row.displayName.toLowerCase().includes(q) ||
        row.userEmail.toLowerCase().includes(q) ||
        row.customSlug.toLowerCase().includes(q) ||
        row.userId.toLowerCase().includes(q),
    );
  }, [creators, query]);

  if (roster.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />;
  }

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
        Content creator roster
      </Text>
      <Text style={{ color: colors.foreground, fontSize: 36, fontWeight: "900" }}>
        {creatorCount}
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted }}> creators</Text>
      </Text>
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>
        {totalFollowers.toLocaleString()} followers · {totalPaid.toLocaleString()} paid subscribers
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
        {roster.data?.audienceRule ?? CREATOR_AUDIENCE_FOLLOW_RULE}
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search name, email, or slug"
        placeholderTextColor={colors.muted}
        maxLength={80}
        style={[styles.search, { borderColor: colors.border, color: colors.foreground }]}
      />

      {filtered.length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>
          {creators.length === 0
            ? "No content creators have enrolled yet."
            : "No creators match that search."}
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 560 }} nestedScrollEnabled>
          {filtered.map((row) => (
            <View
              key={row.userId}
              style={[styles.row, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>
                {row.displayName}
                {row.launchSlot ? ` · slot ${row.launchSlot}` : ""}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{row.userEmail}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                /{row.customSlug} · enrolled {row.enrolledAt.slice(0, 10)}
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800", marginTop: 4 }}>
                {row.followerCount.toLocaleString()} followers
              </Text>
              {row.followers.length > 0 ? (
                <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                  {row.followers.map((f) => shortId(f.userId)).join(" · ")}
                </Text>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 11 }}>No followers yet</Text>
              )}
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800", marginTop: 4 }}>
                {row.paidSubscriberCount.toLocaleString()} paid subscribers
              </Text>
              {row.paidSubscribers.length > 0 ? (
                <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                  {row.paidSubscribers.map((s) => shortId(s.userId)).join(" · ")}
                </Text>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 11 }}>No paid subscribers yet</Text>
              )}
              {row.status.summary ? (
                <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }}>
                  {row.status.summary}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10, marginBottom: 16, marginHorizontal: 16 },
  search: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  row: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 3, marginTop: 8 },
});
