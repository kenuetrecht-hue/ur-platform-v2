import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { SECURITY_BREACH_PROMISE } from "@/lib/signup-step-copy";

export function SecurityIncidentGate() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [checked, setChecked] = useState(false);
  const notice = trpc.conduct.securityNotice.useQuery();
  const ack = trpc.conduct.acknowledgeSecurityNotice.useMutation({
    onSuccess: () => void utils.conduct.securityNotice.invalidate(),
  });

  const active = notice.data?.notice;
  if (notice.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />;
  }
  if (!active || notice.data?.required === false) {
    return null;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.foreground }]}>Security notice</Text>
        <Text style={[styles.sub, { color: colors.muted }]}>
          Posted {new Date(active.publishedAt).toLocaleString()}
        </Text>
        <Text style={[styles.body, { color: colors.foreground }]}>{active.title}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{active.body}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{SECURITY_BREACH_PROMISE}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Change your password on UR if you used it here. If you reused that password on another site, change it
          there too.
        </Text>

        <Pressable onPress={() => setChecked((value) => !value)} style={styles.checkRow}>
          <View
            style={[
              styles.box,
              {
                borderColor: checked ? colors.primary : colors.border,
                backgroundColor: checked ? colors.primary : "transparent",
              },
            ]}
          >
            {checked ? <Text style={styles.mark}>✓</Text> : null}
          </View>
          <Text style={[styles.checkLabel, { color: colors.foreground }]}>
            I read this notice. I will protect my account.
          </Text>
        </Pressable>

        <Pressable
          disabled={!checked || ack.isPending}
          onPress={() => ack.mutate({ noticeId: active.id, acknowledged: true })}
          style={[styles.cta, { backgroundColor: colors.primary, opacity: !checked || ack.isPending ? 0.55 : 1 }]}
        >
          {ack.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>I understand</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40, gap: 10 },
  title: { fontSize: 22, fontWeight: "900" },
  sub: { fontSize: 12 },
  body: { fontSize: 14, lineHeight: 21 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  mark: { color: "#fff", fontSize: 14, fontWeight: "800" },
  checkLabel: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  cta: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
