import { View, Text, Pressable, ActivityIndicator, StyleSheet, Linking } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { usePlatformOwner } from "@/lib/use-platform-owner";

/** Owner commerce dashboard — provider keys, affiliate approvals, catalog sync. */
export function CommerceOpsPanel() {
  const colors = useColors();
  const { isPlatformOwner } = usePlatformOwner();
  const utils = trpc.useUtils();

  const status = trpc.commerce.providerStatus.useQuery();
  const pending = trpc.commerce.pendingAffiliateApprovals.useQuery(undefined, {
    enabled: isPlatformOwner,
  });
  const approve = trpc.commerce.approveAffiliateProduct.useMutation({
    onSuccess: () => void utils.commerce.pendingAffiliateApprovals.invalidate(),
  });
  const sync = trpc.commerce.syncProviderCatalog.useMutation({
    onSuccess: () => void utils.commerce.platformShop.invalidate(),
  });

  if (status.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />;
  }

  const providers = status.data?.providers ?? [];
  const configuredCount = providers.filter((p) => p.configured).length;

  return (
    <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>🛒 Commerce & Providers</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
        {configuredCount}/{providers.length} providers configured · affiliate listings require your
        approval before going live
      </Text>

      <Text style={[styles.section, { color: colors.foreground }]}>Provider status</Text>
      {providers.map((p) => (
        <View
          key={p.id}
          style={[styles.row, { borderColor: colors.border, backgroundColor: colors.background }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
              {p.configured ? "✅" : "⏳"} {p.label}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 10 }}>
              {p.kind} · {p.envKeys.join(", ")}
            </Text>
            {!p.configured ? (
              <Text style={{ color: colors.muted, fontSize: 10 }}>{p.notes}</Text>
            ) : null}
          </View>
          {isPlatformOwner && (p.kind === "pod" || p.kind === "dropship") ? (
            <Pressable
              onPress={() => sync.mutate({ provider: p.id as "printful" | "printify" | "cj_dropshipping" })}
              disabled={sync.isPending}
              style={[styles.smallBtn, { borderColor: colors.primary }]}
            >
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "600" }}>Sync</Text>
            </Pressable>
          ) : null}
          {p.docsUrl ? (
            <Pressable onPress={() => void Linking.openURL(p.docsUrl!)} style={{ padding: 6 }}>
              <Text style={{ color: colors.primary, fontSize: 11 }}>Docs ↗</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {isPlatformOwner ? (
        <>
          <Text style={[styles.section, { color: colors.foreground, marginTop: 12 }]}>
            Pending affiliate / AI listings ({pending.data?.length ?? 0})
          </Text>
          {pending.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (pending.data ?? []).length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 12 }}>No listings awaiting approval.</Text>
          ) : (
            (pending.data ?? []).map((p) =>
              p ? (
                <View
                  key={p.id}
                  style={[styles.row, { borderColor: "#f59e0b", backgroundColor: "#fef3c720" }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: colors.foreground, fontWeight: "700" }}>{p.title}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={2}>
                      {p.description}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>
                      ${(p.priceCents / 100).toFixed(2)} · {p.sourceType} · {p.status}
                    </Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    <Pressable
                      onPress={() => approve.mutate({ productId: p.id, approved: true })}
                      disabled={approve.isPending}
                      style={[styles.approveBtn, { backgroundColor: "#059669" }]}
                    >
                      <Text style={styles.approveText}>Approve</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => approve.mutate({ productId: p.id, approved: false })}
                      disabled={approve.isPending}
                      style={[styles.approveBtn, { backgroundColor: "#dc2626" }]}
                    >
                      <Text style={styles.approveText}>Reject</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null,
            )
          )}
        </>
      ) : null}

      {status.data?.complianceRules ? (
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 10, lineHeight: 15 }}>
          Compliance: {status.data.complianceRules.slice(0, 2).join(" · ")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  title: { fontSize: 16, fontWeight: "800" },
  section: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  row: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  smallBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  approveBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  approveText: { color: "#fff", fontWeight: "700", fontSize: 11 },
});
