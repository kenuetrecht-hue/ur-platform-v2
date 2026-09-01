import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

/** Owner-only English copies of member communications plus signed checkboxes. */
export function PlatformConductReviewPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const review = trpc.conduct.review.useQuery(undefined, { refetchInterval: 8_000 });
  const resolveHold = trpc.conduct.resolveWorldHold.useMutation({
    onSuccess: async () => {
      await utils.conduct.review.invalidate();
    },
  });

  const download = () => {
    if (Platform.OS !== "web" || typeof document === "undefined" || !review.data) return;
    const blob = new Blob([JSON.stringify(review.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ur-conduct-audit-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const flags = review.data?.worldRedFlags ?? [];
  const comms = review.data?.communications ?? [];
  const acks = review.data?.purchaseAcks ?? [];
  const signs = review.data?.signatures ?? [];
  const openFlags = flags.filter((row) => row.status === "paused_review" || row.status === "discontinued");

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: "#ef4444" }]}>World Director red flags</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        Original language and English copy are stored side by side. They already got a warning in
        their native language (English copy of that warning is on file too). Reactivate if it was a
        false alarm. Discontinue if they broke the rules (they leave; money forfeited; no refund).
        You can also type REACTIVATE WORLD USER or DISCONTINUE WORLD USER in World Director chat.
      </Text>
      {openFlags.length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>No members paused for review.</Text>
      ) : null}
      {openFlags.slice(0, 20).map((row) => (
        <View key={row.id} style={[styles.row, { borderColor: "#ef4444" }]}>
          <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "800" }}>
            RED FLAG · {row.status} · {row.channel} · {row.nativeLanguage} · {row.createdAt}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6, fontWeight: "700" }}>
            Original ({row.nativeLanguage})
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
            {row.originalExcerpt}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8, fontWeight: "700" }}>
            English copy
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
            {row.englishExcerpt}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8, fontWeight: "700" }}>
            Warning sent to member ({row.nativeLanguage})
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
            {row.memberWarning}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8, fontWeight: "700" }}>
            Warning (English copy)
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
            {row.memberWarningEnglish}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 }}>
            {row.recommendation}
          </Text>
          {row.status === "paused_review" || row.status === "discontinued" ? (
            <View style={styles.actions}>
              <Pressable
                disabled={resolveHold.isPending}
                onPress={() => resolveHold.mutate({ userId: row.userId, action: "reactivate" })}
                style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}
              >
                <Text style={styles.btnText}>Reactivate</Text>
              </Pressable>
              {row.status === "paused_review" ? (
                <Pressable
                  disabled={resolveHold.isPending}
                  onPress={() => resolveHold.mutate({ userId: row.userId, action: "discontinue" })}
                  style={[styles.btn, { backgroundColor: "#991b1b", flex: 1 }]}
                >
                  <Text style={styles.btnText}>Discontinue</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}

      <Text style={[styles.title, { color: colors.foreground, marginTop: 12 }]}>
        Member communications (original + English)
      </Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        Saved, copied, and timestamped. The original language stays on file. An English copy sits
        next to it for review. Version {review.data?.version ?? "…"}.
      </Text>
      {Platform.OS === "web" ? (
        <Pressable onPress={download} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={styles.btnText}>Download timestamped copy</Text>
        </Pressable>
      ) : null}

      {comms.slice(0, 20).map((row) => (
        <View key={row.id} style={[styles.row, { borderColor: colors.border }]}>
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>
            {row.channel} · {row.createdAt} · {row.originalLanguage}
            {row.translated ? " · bilingual file" : " · already English"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6, fontWeight: "700" }}>
            Original ({row.originalLanguage})
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>{row.original}</Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8, fontWeight: "700" }}>
            English copy
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>{row.english}</Text>
        </View>
      ))}

      <Text style={[styles.title, { color: colors.foreground, marginTop: 12 }]}>No-refund checks</Text>
      {acks.slice(0, 12).map((row) => (
        <Text key={row.id} style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          {row.acceptedAt} · {row.sku} · {(row.amountCents / 100).toFixed(2)} · user {row.userId.slice(0, 8)}
        </Text>
      ))}

      <Text style={[styles.title, { color: colors.foreground, marginTop: 12 }]}>Signed rules</Text>
      {signs.slice(0, 12).map((row) => (
        <Text key={row.id} style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          {row.acceptedAt} · v{row.version} · {row.userEmail ?? row.userId.slice(0, 8)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  title: { fontWeight: "800", fontSize: 15 },
  body: { fontSize: 12, lineHeight: 18 },
  btn: { borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  row: { borderWidth: 1, borderRadius: 10, padding: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
});
