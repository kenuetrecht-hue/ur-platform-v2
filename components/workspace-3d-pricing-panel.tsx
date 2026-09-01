import { useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import type { Workspace3dPlanId } from "@/lib/workspace-3d-pricing";
import { WORKSPACE_3D_PRICING_SUMMARY } from "@/lib/workspace-3d-pricing";
import {
  buildWorkspace3dExtraSlotPurchaseSummary,
  buildWorkspace3dPurchaseSummary,
  type PurchaseSummary,
} from "@/lib/pricing-disclosures";
import { PurchaseSummaryCard } from "@/components/purchase-summary-card";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { useBillingState } from "@/hooks/use-billing-state";
import { PaymentChannelNotice } from "@/components/payment-channel-notice";
import { AiHubTabRow } from "@/components/ai-hub-tab-row";
import { getClientPlatform, openWebBrowserCheckout } from "@/lib/web-checkout";
import { PricingComingSoonPanel } from "@/components/pricing-coming-soon-panel";
import { PUBLIC_PRICING_ENABLED } from "@/lib/pricing-visibility";
import { PurchaseUsageTracker } from "@/components/purchase-usage-tracker";
import { UsageTrackerDashboard } from "@/components/usage-tracker-dashboard";

type PlanOption = {
  planId: Workspace3dPlanId;
  label: string;
  priceDisplay: string;
  priceCents?: number;
  concurrentAiSlots: number;
  tagline: string;
  highlights: string[];
  purchaseSummary?: PurchaseSummary;
};

export function Workspace3dPricingPanel() {
  const colors = useColors();
  if (!PUBLIC_PRICING_ENABLED) {
    return <PricingComingSoonPanel contextLabel="3D Workspace access" />;
  }
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { stateCode, setStateCode, hasState } = useBillingState();
  const clientPlatform = getClientPlatform();
  const isWebCheckout = clientPlatform === "web";

  const [selectedPlan, setSelectedPlan] = useState<Workspace3dPlanId>("pro");
  const [lastReceipt, setLastReceipt] = useState<PurchaseSummary | null>(null);

  const access = trpc.workspace3d.getAccess.useQuery(undefined, { enabled: isAuthenticated });
  const plans = trpc.workspace3d.getPlans.useQuery({
    stateCode: stateCode ?? undefined,
  });

  const purchase = trpc.workspace3d.purchase.useMutation({
    onSuccess: (data) => {
      if (data.receipt) setLastReceipt(data.receipt);
      void utils.workspace3d.getAccess.invalidate();
      void utils.usageCredits.getMyTracker.invalidate();
    },
  });

  const purchaseExtra = trpc.workspace3d.purchaseExtraSlot.useMutation({
    onSuccess: (data) => {
      if (data.receipt) setLastReceipt(data.receipt);
      void utils.workspace3d.getAccess.invalidate();
      void utils.usageCredits.getMyTracker.invalidate();
    },
  });

  const planList = (plans.data?.plans ?? []) as PlanOption[];

  const selectedSummary = useMemo(() => {
    if (!hasState) return null;
    const fromApi = planList.find((p) => p.planId === selectedPlan)?.purchaseSummary;
    if (fromApi) return fromApi;
    return buildWorkspace3dPurchaseSummary({
      planId: selectedPlan,
      stateCode,
      priceCents: planList.find((p) => p.planId === selectedPlan)?.priceCents,
    });
  }, [hasState, selectedPlan, stateCode, planList]);

  const extraSlotSummary = useMemo(() => {
    if (!hasState) return null;
    if (plans.data?.extraAiSlot.purchaseSummary) return plans.data.extraAiSlot.purchaseSummary;
    return buildWorkspace3dExtraSlotPurchaseSummary(
      stateCode,
      plans.data?.extraAiSlot.priceCents,
    );
  }, [hasState, stateCode, plans.data?.extraAiSlot]);

  if (access.isLoading && isAuthenticated) {
    return (
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const activeBanner =
    isAuthenticated && access.data?.hasAccess ? (
      <View style={[styles.activeBox, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>✓ Workspace access active</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
          {access.data.maxConcurrentAiSlots} concurrent AI slot
          {access.data.maxConcurrentAiSlots === 1 ? "" : "s"}
          {access.data.plan ? ` · ${access.data.plan.replace("_", " ")} plan` : ""}
          {access.data.expiresAt
            ? ` · until ${new Date(access.data.expiresAt).toLocaleDateString()}`
            : ""}
        </Text>
        {access.data.extraAiSlots > 0 ? (
          <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4, fontWeight: "600" }}>
            +{access.data.extraAiSlots} extra slot{access.data.extraAiSlots === 1 ? "" : "s"}
          </Text>
        ) : null}
        {access.data.expiresAt ? (
          <PurchaseUsageTracker
            title="3D workspace"
            used={0}
            included={access.data.maxConcurrentAiSlots}
            remaining={access.data.maxConcurrentAiSlots}
            unit="concurrent AI slots"
            loseByLabel={`Use by ${new Date(access.data.expiresAt).toLocaleDateString()} or unused workspace time is lost`}
            compact
          />
        ) : null}
      </View>
    ) : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={styles.heroEmoji}>🎮</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>3D Workspace Plans</Text>
          <Text style={[styles.heroSub, { color: colors.muted }]}>
            One lab, many specialists — pay for how many AIs work together at once.
          </Text>
        </View>
      </View>

      {activeBanner}
      <UsageTrackerDashboard />

      <Text style={[styles.sectionTag, { color: colors.primary }]}>BUNDLES</Text>
      <Text style={[styles.sectionHint, { color: colors.muted }]}>{WORKSPACE_3D_PRICING_SUMMARY}</Text>
      <Text style={[styles.sectionHint, { color: colors.muted }]}>
        Text chat still uses each specialist&apos;s day/week/month plan. Voice uses Talk Time.
      </Text>

      <PaymentChannelNotice compact />

      <BillingStatePicker value={stateCode} onChange={setStateCode} />

      {hasState && planList.length > 0 ? (
        <AiHubTabRow
          tabs={planList.map((p) => ({
            id: p.planId,
            label: p.priceDisplay,
            emoji:
              p.planId === "day_pass"
                ? "⏱️"
                : p.planId === "solo"
                  ? "👤"
                  : p.planId === "pro"
                    ? "👥"
                    : "🏢",
          }))}
          activeId={selectedPlan}
          onSelect={(id) => {
            setSelectedPlan(id as Workspace3dPlanId);
            setLastReceipt(null);
          }}
          style={{ paddingHorizontal: 0 }}
        />
      ) : null}

      {hasState ? (
        <View style={styles.planRow}>
          {planList.map((p) => {
            const active = selectedPlan === p.planId;
            const planSummary = buildWorkspace3dPurchaseSummary({
              planId: p.planId,
              stateCode,
            });
            return (
              <Pressable
                key={p.planId}
                onPress={() => {
                  setSelectedPlan(p.planId);
                  setLastReceipt(null);
                }}
                style={[
                  styles.planCard,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? `${colors.primary}18` : colors.background,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>{p.label}</Text>
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 18, marginTop: 4 }}>
                  {p.priceDisplay}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>
                  {p.concurrentAiSlots} AI{p.concurrentAiSlots === 1 ? "" : "s"} at once
                </Text>
                <Text style={{ color: colors.muted, fontSize: 9, marginTop: 2 }}>{p.tagline}</Text>
                <Text style={{ color: colors.muted, fontSize: 9, marginTop: 4, textAlign: "center" }}>
                  Total {planSummary.pricing.totalDisplay} incl. tax & fees
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {selectedSummary ? <PurchaseSummaryCard summary={selectedSummary} /> : null}

      <Pressable
        disabled={purchase.isPending || !selectedPlan || !isAuthenticated || !selectedSummary || !hasState}
        onPress={() => {
          if (!isAuthenticated || !selectedPlan || !stateCode) return;
          if (!isWebCheckout) {
            void openWebBrowserCheckout("/3d-workspace?pricing=1");
            return;
          }
          purchase.mutate({ plan: selectedPlan, stateCode, clientPlatform: "web" });
        }}
        style={[
          styles.cta,
          {
            backgroundColor: colors.primary,
            opacity: purchase.isPending || !isAuthenticated || !hasState ? 0.7 : 1,
          },
        ]}
      >
        {purchase.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>
            {!isAuthenticated
              ? "Sign in to subscribe"
              : !hasState
                ? "Select billing state"
                : isWebCheckout
                  ? "Purchase workspace plan"
                  : "Continue in browser"}
          </Text>
        )}
      </Pressable>

      {lastReceipt ? (
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8, lineHeight: 16 }}>
          ✓ Purchase recorded — {lastReceipt.youPay.value}
        </Text>
      ) : null}

      {access.data?.hasAccess && access.data.plan && access.data.plan !== "day_pass" ? (
        <>
          <Text style={[styles.sectionTag, { color: colors.primary, marginTop: 16 }]}>ADD-ON</Text>
          <Text style={[styles.sectionHint, { color: colors.muted }]}>
            Extra concurrent AI slot — {plans.data?.extraAiSlot.priceDisplay}/mo each
          </Text>
          {extraSlotSummary ? <PurchaseSummaryCard summary={extraSlotSummary} /> : null}
          <Pressable
            disabled={purchaseExtra.isPending || !isAuthenticated || !hasState}
            onPress={() => {
              if (!isAuthenticated || !stateCode) return;
              if (!isWebCheckout) {
                void openWebBrowserCheckout("/3d-workspace?pricing=1");
                return;
              }
              purchaseExtra.mutate({ stateCode, clientPlatform: "web" });
            }}
            style={[
              styles.ctaSecondary,
              {
                borderColor: colors.primary,
                opacity: purchaseExtra.isPending || !isAuthenticated || !hasState ? 0.7 : 1,
              },
            ]}
          >
            {purchaseExtra.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {isWebCheckout ? "+ Add extra AI slot" : "Add slot in browser"}
              </Text>
            )}
          </Pressable>
        </>
      ) : null}

      <PaymentChannelNotice />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 8, paddingBottom: 24, gap: 4 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  heroEmoji: { fontSize: 32 },
  heroTitle: { fontSize: 18, fontWeight: "900" },
  heroSub: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginHorizontal: 6,
    marginTop: 4,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 6,
    marginBottom: 6,
  },
  box: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 8,
  },
  activeBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  planRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 6,
    marginTop: 8,
  },
  planCard: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  cta: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginHorizontal: 8,
    marginTop: 10,
  },
  ctaSecondary: {
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginHorizontal: 8,
    marginTop: 8,
    borderWidth: 1,
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
