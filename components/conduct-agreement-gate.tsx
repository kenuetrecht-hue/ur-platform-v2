import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { AgreeAndReadRow } from "@/components/agree-and-read-row";
import { hasRememberedJoinAgreement } from "@/lib/join-rules-agreement";

const ONE_RULES_LABEL = "I agree to the Terms of Use, rules, and regulations.";

/** One box for the rules. Skipped when Sign up already recorded that same check. */
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
  const started = useRef(false);
  const version = status.data?.version;

  useEffect(() => {
    if (!version || started.current || accept.isPending) return;
    if (!hasRememberedJoinAgreement(version)) return;
    started.current = true;
    accept.mutate({ accepted: true, version });
  }, [accept, version]);

  if (status.isLoading || (version && hasRememberedJoinAgreement(version) && !accept.isError)) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ color: colors.muted, fontSize: 15 }}>Opening UR…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Agree to the rules</Text>
      <AgreeAndReadRow
        checked={checked}
        onToggle={() => setChecked((value) => !value)}
        label={ONE_RULES_LABEL}
        href="/terms"
        testID="conduct-agree"
      />
      {accept.error ? <Text style={styles.error}>{accept.error.message}</Text> : null}
      <Pressable
        disabled={!version || !checked || accept.isPending}
        onPress={() => {
          if (!version || !checked || accept.isPending) return;
          accept.mutate({ accepted: true, version });
        }}
        style={[
          styles.cta,
          { backgroundColor: colors.primary, opacity: !checked || accept.isPending ? 0.55 : 1 },
        ]}
      >
        <Text style={styles.ctaText}>{accept.isPending ? "Saving…" : "Submit"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 16 },
  center: { justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "900" },
  error: { color: "#ef4444", fontSize: 14 },
  cta: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
