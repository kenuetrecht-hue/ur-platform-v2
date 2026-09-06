import { ActivityIndicator, Linking, Pressable, Text, View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function CommerceTrendOpsPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const signals = trpc.commerce.trendSignals.useQuery();
  const refresh = trpc.commerce.refreshTrendSignals.useMutation({
    onSuccess: () => {
      void utils.commerce.trendSignals.invalidate();
      void utils.commerce.trendingMarkets.invalidate();
    },
  });

  if (signals.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />;
  }

  const data = signals.data;
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
        Trending markets to stock
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        We search creator gear and trade materials. This does not invent products or auto-list ASINs.
        {data?.refreshedAt ? ` Last search ${new Date(data.refreshedAt).toLocaleString()}.` : " Not searched yet."}{" "}
        {data?.gaps ?? 0} gaps.
      </Text>
      <Pressable
        onPress={() => refresh.mutate()}
        disabled={refresh.isPending}
        style={[styles.btn, { backgroundColor: colors.primary }]}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
          {refresh.isPending ? "Searching…" : "Refresh online market signals"}
        </Text>
      </Pressable>
      {(data?.signals ?? []).slice(0, 10).map((signal) => (
        <View key={signal.id} style={[styles.row, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
            {signal.isGap ? "GAP" : "IN STOCK"} · {signal.label}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
            Stock: {signal.shopNeed}
            {signal.matchingTitles.length ? ` · have ${signal.matchingTitles.join(", ")}` : ""}
          </Text>
          {signal.sources[0] ? (
            <Pressable onPress={() => void Linking.openURL(signal.sources[0]!.url)}>
              <Text style={{ color: colors.primary, fontSize: 11 }}>{signal.sources[0].title} ↗</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  btn: { borderRadius: 10, padding: 10, alignItems: "center" },
  row: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 3 },
});
