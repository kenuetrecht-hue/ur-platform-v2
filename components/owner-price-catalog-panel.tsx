import { useMemo, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { AppPressable } from "@/components/app-pressable";
import type { OwnerPriceCategory } from "@/lib/owner-price-catalog";

const CATEGORY_LABEL: Record<OwnerPriceCategory, string> = {
  text_pass: "Text pass",
  concurrent_slot: "Extra concurrent AI",
  talk: "Talk time",
  workspace_3d: "3D lab",
  credits: "Credits & add-ons",
};

const CATEGORY_ORDER: OwnerPriceCategory[] = [
  "text_pass",
  "concurrent_slot",
  "talk",
  "workspace_3d",
  "credits",
];

export function OwnerPriceCatalogPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const catalog = trpc.platformOps.listOwnerPriceCatalog.useQuery();
  const setPrice = trpc.platformOps.setOwnerPrice.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.platformOps.listOwnerPriceCatalog.invalidate(),
        utils.aiSubscription.getPlans.invalidate(),
        utils.aiTalk.getPlans.invalidate(),
        utils.workspace3d.getPlans.invalidate(),
        utils.usageCredits.getCatalog.invalidate(),
        utils.usageCredits.getUpgradeOptions.invalidate(),
      ]);
    },
  });
  const resetPrice = trpc.platformOps.resetOwnerPrice.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.platformOps.listOwnerPriceCatalog.invalidate(),
        utils.aiSubscription.getPlans.invalidate(),
        utils.aiTalk.getPlans.invalidate(),
        utils.workspace3d.getPlans.invalidate(),
        utils.usageCredits.getCatalog.invalidate(),
        utils.usageCredits.getUpgradeOptions.invalidate(),
      ]);
    },
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [hint, setHint] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const rows = catalog.data ?? [];
    return CATEGORY_ORDER.map((category) => ({
      category,
      rows: rows.filter((row) => row.category === category),
    })).filter((group) => group.rows.length > 0);
  }, [catalog.data]);

  const busy = setPrice.isPending || resetPrice.isPending;

  const applyDollars = (skuId: string, liveDisplay: string) => {
    const raw = (drafts[skuId] ?? liveDisplay.replace("$", "")).trim();
    const dollars = Number(raw);
    if (!Number.isFinite(dollars)) {
      setHint("Enter a dollar amount like 24.99");
      return;
    }
    setHint(null);
    setPrice.mutate(
      { skuId, priceCents: Math.round(dollars * 100) },
      {
        onSuccess: (row) => {
          setDrafts((current) => ({ ...current, [skuId]: "" }));
          setHint(
            row.appStoreFiveDollarWarning
              ? `${row.label} is now ${row.liveDisplay}. That talk pack is no longer $5.00, so it checks out on the website.`
              : `${row.label} is now ${row.liveDisplay}. Checkout uses this amount immediately.`,
          );
        },
        onError: (error) => setHint(error.message),
      },
    );
  };

  return (
    <View
      style={{
        marginHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 14,
        gap: 10,
      }}
    >
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>
        Price catalog
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
        Change what customers pay whenever you need to. Checkout uses the live amount right away.
        Existing purchases stay at what they already paid. You can also tell Business Steward: SET
        PRICE monthly text 29.99
      </Text>
      {catalog.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {hint ? (
        <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 17 }}>{hint}</Text>
      ) : null}
      {setPrice.error || resetPrice.error ? (
        <Text style={{ color: "#b45309", fontSize: 12 }}>
          {setPrice.error?.message ?? resetPrice.error?.message}
        </Text>
      ) : null}
      {grouped.map((group) => (
        <View key={group.category} style={{ gap: 8 }}>
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 11, letterSpacing: 0.6 }}>
            {CATEGORY_LABEL[group.category].toUpperCase()}
          </Text>
          {group.rows.map((row) => (
            <View
              key={row.id}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                padding: 10,
                gap: 6,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
                {row.label}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                Live {row.liveDisplay}
                {row.isOverride ? ` · default ${row.defaultDisplay}` : " · default"}
              </Text>
              {row.note ? (
                <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>{row.note}</Text>
              ) : null}
              {row.appStoreFiveDollarWarning ? (
                <Text style={{ color: "#b45309", fontSize: 11, lineHeight: 16 }}>
                  Not $5.00 — this pack will check out on the website, not in the app.
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TextInput
                  value={drafts[row.id] ?? ""}
                  onChangeText={(value) =>
                    setDrafts((current) => ({ ...current, [row.id]: value }))
                  }
                  placeholder={row.liveDisplay.replace("$", "")}
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  maxLength={8}
                  editable={!busy}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    color: colors.foreground,
                    fontSize: 13,
                  }}
                />
                <AppPressable
                  disabled={busy}
                  onPress={() => applyDollars(row.id, row.liveDisplay)}
                  style={{
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }} pointerEvents="none">
                    Set
                  </Text>
                </AppPressable>
                {row.isOverride ? (
                  <AppPressable
                    disabled={busy}
                    onPress={() =>
                      resetPrice.mutate(
                        { skuId: row.id },
                        {
                          onSuccess: (updated) => {
                            setDrafts((current) => ({ ...current, [row.id]: "" }));
                            setHint(`${updated.label} is back to ${updated.liveDisplay}.`);
                          },
                          onError: (error) => setHint(error.message),
                        },
                      )
                    }
                    style={{
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}
                      pointerEvents="none"
                    >
                      Reset
                    </Text>
                  </AppPressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
