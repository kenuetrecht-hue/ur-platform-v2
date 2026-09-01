import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Linking, TextInput } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { OWNER_DIGITAL_KIND_LABEL, OWNER_DIGITAL_KINDS, type OwnerDigitalKind } from "@/lib/affiliate-link-policy";

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
  const catalog = trpc.commerce.ownerPlatformCatalog.useQuery(undefined, {
    enabled: isPlatformOwner,
  });
  const addProduct = trpc.commerce.addProduct.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setAffiliateUrl("");
      setImageUrl("");
      void utils.commerce.platformShop.invalidate();
      void utils.commerce.ownerPlatformCatalog.invalidate();
      void utils.commerce.pendingAffiliateApprovals.invalidate();
    },
  });
  const [listingKind, setListingKind] = useState<"owner_digital" | "affiliate">("owner_digital");
  const [digitalKind, setDigitalKind] = useState<OwnerDigitalKind>("ebook");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("9.99");
  const [imageUrl, setImageUrl] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");

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
            List on the UR shop (not creator stores)
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 8 }}>
            Creators already list merch in their own shops. Use this form for your ebooks, songs, merch,
            and Amazon/Walmart affiliate picks.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            {(
              [
                { id: "owner_digital" as const, label: "Your original" },
                { id: "affiliate" as const, label: "Amazon / Walmart" },
              ]
            ).map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => setListingKind(opt.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: listingKind === opt.id ? colors.primary : colors.border,
                    backgroundColor: listingKind === opt.id ? `${colors.primary}18` : colors.background,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          {listingKind === "owner_digital" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {OWNER_DIGITAL_KINDS.map((kind) => (
                <Pressable
                  key={kind}
                  onPress={() => setDigitalKind(kind)}
                  style={[
                    styles.chip,
                    {
                      borderColor: digitalKind === kind ? colors.primary : colors.border,
                      backgroundColor: digitalKind === kind ? `${colors.primary}18` : colors.background,
                    },
                  ]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: "600" }}>
                    {OWNER_DIGITAL_KIND_LABEL[kind]}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            maxLength={120}
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (FTC disclosure for affiliate picks)"
            maxLength={2000}
            multiline
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, minHeight: 56 }]}
          />
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="Display price USD"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <TextInput
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="Image URL (optional)"
            maxLength={2000}
            autoCapitalize="none"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          {listingKind === "affiliate" ? (
            <TextInput
              value={affiliateUrl}
              onChangeText={setAffiliateUrl}
              placeholder="Official amazon.com or walmart.com product URL"
              maxLength={2000}
              autoCapitalize="none"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
          ) : null}
          <Pressable
            disabled={
              !title.trim() ||
              addProduct.isPending ||
              !catalog.data?.store.id ||
              (listingKind === "affiliate" && !affiliateUrl.trim())
            }
            onPress={() => {
              const priceCents = Math.round(parseFloat(price || "0") * 100);
              if (!Number.isFinite(priceCents) || priceCents < 99) return;
              addProduct.mutate({
                storeId: catalog.data!.store.id,
                title: title.trim(),
                description: description.trim(),
                priceCents,
                imageUrl: imageUrl.trim() || undefined,
                sourceType: listingKind,
                digitalKind: listingKind === "owner_digital" ? digitalKind : undefined,
                affiliateUrl: listingKind === "affiliate" ? affiliateUrl.trim() : undefined,
                category: listingKind === "owner_digital" ? OWNER_DIGITAL_KIND_LABEL[digitalKind] : "Affiliate",
              });
            }}
            style={[styles.listBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.approveText}>
              {addProduct.isPending
                ? "Listing…"
                : listingKind === "affiliate"
                  ? "Add affiliate pick (pauses until you approve)"
                  : "List original on UR shop"}
            </Text>
          </Pressable>
          {addProduct.error ? (
            <Text style={{ color: "#dc2626", fontSize: 11 }}>{addProduct.error.message}</Text>
          ) : null}

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
  chip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13, marginTop: 6 },
  listBtn: { borderRadius: 10, padding: 12, alignItems: "center", marginTop: 8 },
});
