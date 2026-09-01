import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { CONDUCT_CHECKBOX_LABEL } from "@/lib/platform-terms-of-use";

/** Blocks the product until the member signs the current conduct rules. */
export function ConductAgreementGate() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [checked, setChecked] = useState(false);
  const status = trpc.conduct.status.useQuery();
  const accept = trpc.conduct.accept.useMutation({
    onSuccess: async () => {
      await utils.conduct.status.invalidate();
    },
  });

  const bullets = status.data?.bullets ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.foreground }]}>UR Platform rules — sign to enter</Text>
        <Text style={[styles.sub, { color: colors.muted }]}>
          Version {status.data?.version ?? "…"} · Effective {status.data?.effectiveDate ?? ""}
        </Text>
        <Text style={[styles.body, { color: colors.foreground }]}>
          {status.data?.purpose ?? "We are here to have fun, to learn, to educate each other, and to be friendly."}
        </Text>
        {bullets.map((bullet) => (
          <Text key={bullet.slice(0, 48)} style={[styles.bullet, { color: colors.muted }]}>
            • {bullet}
          </Text>
        ))}

        <Pressable
          onPress={() => setChecked((v) => !v)}
          style={styles.checkRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
        >
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
            {status.data?.checkboxLabel ?? CONDUCT_CHECKBOX_LABEL}
          </Text>
        </Pressable>

        {accept.error ? (
          <Text style={styles.error}>{accept.error.message}</Text>
        ) : null}

        <Pressable
          disabled={!checked || accept.isPending || !status.data?.version}
          onPress={() => {
            if (!status.data?.version || !checked) return;
            accept.mutate({ accepted: true, version: status.data.version });
          }}
          style={[
            styles.cta,
            { backgroundColor: colors.primary, opacity: !checked || accept.isPending ? 0.55 : 1 },
          ]}
        >
          {accept.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>I sign these rules</Text>
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
  sub: { fontSize: 12, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21, fontWeight: "600" },
  bullet: { fontSize: 13, lineHeight: 20 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 12 },
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
  error: { color: "#ef4444", fontSize: 13 },
  cta: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
