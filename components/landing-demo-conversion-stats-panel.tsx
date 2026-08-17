import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function LandingDemoConversionStatsPanel() {
  const colors = useColors();
  const stats = trpc.landing.ownerDemoConversionStats.useQuery(undefined, {
    retry: 1,
  });

  if (stats.isLoading) {
    return (
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (stats.error || !stats.data) return null;

  const { totalDemos, totalSignupClicks, totalConversions, demoToClickRate, demoToSignupRate } =
    stats.data;

  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>
        Free AI sample → signup funnel
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
        Tracks visitors who try the landing demo on web/app and later create an account.
      </Text>

      <View style={styles.row}>
        <Stat label="Demos" value={totalDemos} colors={colors} />
        <Stat label="Signup clicks" value={totalSignupClicks} colors={colors} />
        <Stat label="Joined" value={totalConversions} colors={colors} />
      </View>

      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>
        Demo → click: {(demoToClickRate * 100).toFixed(1)}% · Demo → account:{" "}
        {(demoToSignupRate * 100).toFixed(1)}%
      </Text>

      {stats.data.byCreator.slice(0, 4).map((row) => (
        <Text key={row.creatorId} style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>
          {row.creatorId}: {row.demos} demos · {row.conversions} joined
        </Text>
      ))}
    </View>
  );
}

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.stat}>
      <Text style={{ color: colors.muted, fontSize: 10 }}>{label}</Text>
      <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 18 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  row: { flexDirection: "row", marginTop: 12, gap: 8 },
  stat: { flex: 1, alignItems: "center" },
});
