import { useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { useBillingState } from "@/hooks/use-billing-state";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { getClientPlatform } from "@/lib/web-checkout";
import type { CreditProductId } from "@/lib/usage-caps-catalog";
import { buildUsageCreditPurchaseSummary } from "@/lib/pricing-disclosures";
import { PurchaseSummaryCard } from "@/components/purchase-summary-card";

type Props = {
  productId: CreditProductId;
  creatorId?: string;
  title?: string;
  compact?: boolean;
};

export function UsageUpgradePanel({ productId, creatorId, title, compact = false }: Props) {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const { stateCode, setStateCode, hasState } = useBillingState();
  const clientPlatform = getClientPlatform();
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month">("week");

  const options = trpc.usageCredits.getUpgradeOptions.useQuery(
    { productId, creatorId },
    { enabled: isAuthenticated },
  );

  const purchase = trpc.usageCredits.purchase.useMutation({
    onSuccess: () => {
      void options.refetch();
    },
  });

  const balance = options.data?.balance;
  const creditPlans = useMemo(
    () =>
      (options.data?.creditUpgradeOptions ?? []).filter(
        (o) => o.period === "day" || o.period === "week" || o.period === "month",
      ),
    [options.data?.creditUpgradeOptions],
  );
  const addons = useMemo(
    () => (options.data?.creditUpgradeOptions ?? []).filter((o) => o.period === "addon"),
    [options.data?.creditUpgradeOptions],
  );

  if (!isAuthenticated || compact) return null;

  const selectedPlan = creditPlans.find((p) => p.period === selectedPeriod) ?? creditPlans[0];

  const purchaseSummary = useMemo(() => {
    if (!hasState || !selectedPlan || selectedPlan.period === "addon") return null;
    return buildUsageCreditPurchaseSummary({
      productId,
      period: selectedPlan.period as "day" | "week" | "month",
      stateCode,
    });
  }, [hasState, selectedPlan, productId, stateCode]);

  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>
        {title ?? "Usage & upgrades"}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
        You pay a fixed price → You receive a fixed number of credits. No unlimited use.
      </Text>

      {balance ? (
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
          {balance.remaining} {balance.unit} left
          {balance.dailyHardCap ? ` · max ${balance.dailyHardCap}/day` : ""}
        </Text>
      ) : null}

      {options.data?.includedWebSearchesToday != null && creatorId ? (
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
          {options.data.includedWebSearchesToday} included web searches left today (with text plan)
        </Text>
      ) : null}

      <BillingStatePicker value={stateCode} onChange={setStateCode} />

      {hasState && creditPlans.length > 0 ? (
        <View style={styles.planRow}>
          {creditPlans.map((plan) => {
            const active = selectedPeriod === plan.period;
            return (
              <Pressable
                key={plan.period}
                onPress={() => setSelectedPeriod(plan.period as "day" | "week" | "month")}
                style={[
                  styles.planCard,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? `${colors.primary}18` : colors.background,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
                  {plan.label}
                </Text>
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 16, marginTop: 4 }}>
                  {plan.priceDisplay}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4, textAlign: "center" }}>
                  You get {plan.included} {plan.unit}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 9, marginTop: 2, textAlign: "center" }}>
                  {plan.upgradeDetail}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {purchaseSummary ? <PurchaseSummaryCard summary={purchaseSummary} /> : null}

      {selectedPlan && hasState ? (
        <Pressable
          disabled={purchase.isPending}
          onPress={() => {
            if (!stateCode || !selectedPlan) return;
            purchase.mutate({
              productId,
              period: selectedPlan.period as "day" | "week" | "month",
              stateCode,
              clientPlatform,
            });
          }}
          style={[styles.cta, { backgroundColor: colors.primary, opacity: purchase.isPending ? 0.7 : 1 }]}
        >
          {purchase.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "800" }}>
              Buy {selectedPlan.included} {selectedPlan.unit} — {selectedPlan.priceDisplay}
            </Text>
          )}
        </Pressable>
      ) : null}

      {addons.length > 0 ? (
        <View style={{ marginTop: 10, gap: 6 }}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>Quick top-ups</Text>
          {addons.map((addon) => (
            <Pressable
              key={addon.addonId}
              disabled={purchase.isPending || !hasState}
              onPress={() => {
                if (!stateCode || !addon.addonId) return;
                purchase.mutate({
                  productId,
                  addonId: addon.addonId,
                  stateCode,
                  clientPlatform,
                });
              }}
              style={[styles.addonRow, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.foreground, fontSize: 12, flex: 1 }}>{addon.label}</Text>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>{addon.priceDisplay}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {purchase.isSuccess ? (
        <Text style={{ color: colors.primary, fontSize: 11, marginTop: 8 }}>{purchase.data?.message}</Text>
      ) : null}
      {purchase.error ? (
        <Text style={{ color: "#e55", fontSize: 11, marginTop: 8 }}>{purchase.error.message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  planRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  planCard: {
    flex: 1,
    minWidth: 90,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
  },
  cta: {
    marginTop: 10,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  addonRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
});
