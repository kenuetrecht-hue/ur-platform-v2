import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

/** Platform owner — review impersonation / content theft reports. */
export function PlatformContentProtectionPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const reports = trpc.contentProtection.listOpenReports.useQuery();

  const review = trpc.contentProtection.reviewReport.useMutation({
    onSuccess: () => void utils.contentProtection.listOpenReports.invalidate(),
  });

  if (reports.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />;
  }

  const open = reports.data ?? [];

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>
        Content protection queue
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
        Impersonation, theft, and unauthorized repost reports. Confirm applies a strike (3 = publish blocked).
      </Text>

      {open.length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>No open reports.</Text>
      ) : (
        open.map((r) => (
          <View
            key={r.id}
            style={[styles.reportRow, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
              {r.reportType.replace(/_/g, " ")} · subject {r.subjectUserId.slice(0, 12)}…
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }} numberOfLines={3}>
              {r.description}
            </Text>
            <View style={styles.actions}>
              <Pressable
                disabled={review.isPending}
                onPress={() => review.mutate({ reportId: r.id, decision: "confirmed" })}
                style={[styles.actionBtn, { backgroundColor: colors.error ?? "#ef4444" }]}
              >
                <Text style={styles.actionText}>Confirm strike</Text>
              </Pressable>
              <Pressable
                disabled={review.isPending}
                onPress={() => review.mutate({ reportId: r.id, decision: "dismissed" })}
                style={[styles.actionBtn, { backgroundColor: colors.muted }]}
              >
                <Text style={styles.actionText}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10, marginBottom: 16 },
  reportRow: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
