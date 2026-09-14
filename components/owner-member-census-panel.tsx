import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type { CensusPerson } from "@/lib/owner-member-census";

function kindLabel(kind: CensusPerson["kind"]): string {
  if (kind === "creator") return "Content creator";
  if (kind === "owner") return "You (owner)";
  return "Member";
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

/** Owner-only: who joined, who is on the site now, creators vs members. */
export function OwnerMemberCensusPanel() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const census = trpc.platformOps.getMemberCensus.useQuery(undefined, {
    refetchInterval: 20_000,
  });

  const people = census.data?.people ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (row) => row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q),
    );
  }, [people, query]);

  if (census.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />;
  }

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]} testID="owner-member-census">
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>Who joined UR</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
        Names and emails stay here for you only. On the website now means they opened UR in the last 30
        minutes. For each content creator you also see paid subscribers and unpaid followers.
      </Text>

      <View style={styles.counts}>
        <CountBox colors={colors} label="Joined" value={census.data?.joinedCount ?? 0} />
        <CountBox colors={colors} label="On the site now" value={census.data?.onSiteNowCount ?? 0} />
        <CountBox colors={colors} label="Content creators" value={census.data?.creatorCount ?? 0} />
        <CountBox colors={colors} label="Members" value={census.data?.regularMemberCount ?? 0} />
        <CountBox colors={colors} label="Paid subscribers" value={census.data?.paidSubscriberCount ?? 0} />
        <CountBox colors={colors} label="Unpaid followers" value={census.data?.unpaidFollowerCount ?? 0} />
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search a name or email"
        placeholderTextColor={colors.muted}
        maxLength={80}
        autoCapitalize="none"
        style={[styles.search, { borderColor: colors.border, color: colors.foreground }]}
      />

      {filtered.length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          {people.length === 0
            ? "No one has signed in on this live site yet. After someone Login or Sign up, they show up here."
            : "No names match that search."}
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 480 }} nestedScrollEnabled>
          {filtered.map((row) => (
            <View
              key={row.email}
              style={[styles.row, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>{row.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{row.email}</Text>
              <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>
                {kindLabel(row.kind)}
                {row.onSiteNow ? " · on the site now" : ""}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                Joined {formatWhen(row.joinedAt)} · last visit {formatWhen(row.lastSeenAt)}
              </Text>
              {row.kind === "creator" ? (
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700", marginTop: 4 }}>
                  {row.paidSubscriberCount} paid subscriber{row.paidSubscriberCount === 1 ? "" : "s"} ·{" "}
                  {row.unpaidFollowerCount} unpaid follower{row.unpaidFollowerCount === 1 ? "" : "s"}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function CountBox({
  colors,
  label,
  value,
}: {
  colors: { border: string; background: string; foreground: string; muted: string };
  label: string;
  value: number;
}) {
  return (
    <View style={[styles.count, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10, marginBottom: 16, marginHorizontal: 16 },
  counts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  count: { borderWidth: 1, borderRadius: 10, padding: 10, minWidth: 140, flexGrow: 1 },
  search: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  row: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 3, marginTop: 8 },
});
