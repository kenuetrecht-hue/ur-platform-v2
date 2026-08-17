import { useMemo, useState } from "react";

import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";

import { useColors } from "@/hooks/use-colors";

import { trpc } from "@/lib/trpc";

import { useAuth } from "@/lib/auth-context";

import type { AiSubscriptionPlan } from "@/lib/ai-subscription-pricing";

import { buildSubscriptionPurchaseSummary, type PurchaseSummary } from "@/lib/pricing-disclosures";

import { PurchaseSummaryCard } from "@/components/purchase-summary-card";

import { BillingStatePicker } from "@/components/billing-state-picker";

import { useBillingState } from "@/hooks/use-billing-state";

import type { AiPriceTier } from "@/lib/ai-subscription-pricing";

import { PaymentChannelNotice } from "@/components/payment-channel-notice";

import { UsageUpgradePanel } from "@/components/usage-upgrade-panel";

import {
  buildAiSubscriptionWebPath,
  getClientPlatform,
  openWebBrowserCheckout,
} from "@/lib/web-checkout";
import { formatAllowanceHeadline } from "@/lib/pricing-transparency";



type Props = {

  creatorId: string;

  creatorName: string;

  compact?: boolean;

  /** Pricing tab — always show plan cards (even when subscribed). */
  mode?: "default" | "pricing";

};



type PlanOption = {

  plan: AiSubscriptionPlan;

  label: string;

  priceDisplay: string;

  savingsVsDaily?: string;

  messagesIncluded?: number;

};



export function AiSubscriptionPanel({ creatorId, creatorName, compact = false, mode = "default" }: Props) {

  const colors = useColors();

  const { isAuthenticated } = useAuth();

  const utils = trpc.useUtils();

  const { stateCode, setStateCode, hasState } = useBillingState();

  const clientPlatform = getClientPlatform();

  const isWebCheckout = clientPlatform === "web";

  const [selectedPlan, setSelectedPlan] = useState<AiSubscriptionPlan>("week");

  const [lastReceipt, setLastReceipt] = useState<PurchaseSummary | null>(null);



  const access = trpc.aiSubscription.getAccess.useQuery(

    { creatorId },

    { enabled: isAuthenticated },

  );

  const plans = trpc.aiSubscription.getPlans.useQuery({
    creatorId,
    stateCode: stateCode ?? undefined,
  });



  const purchase = trpc.aiSubscription.purchase.useMutation({

    onSuccess: (data) => {

      if (data.receipt) setLastReceipt(data.receipt);

      void utils.aiSubscription.getAccess.invalidate({ creatorId });

      void utils.platformOps.getMyAccess.invalidate();

    },

  });



  const planList = (plans.data?.plans ?? []) as PlanOption[];

  const tier = plans.data?.tier as AiPriceTier | undefined;

  const tierLabel = plans.data?.tierLabel;



  const selectedSummary = useMemo(() => {

    if (!hasState || !tier || !tierLabel) return null;

    return buildSubscriptionPurchaseSummary({

      creatorId,

      creatorName,

      plan: selectedPlan,

      tier,

      tierLabel,

      stateCode,

    });

  }, [hasState, tier, tierLabel, creatorId, creatorName, selectedPlan, stateCode]);



  const activeUsageLine = useMemo(() => {

    const u = access.data?.usage;

    if (!u) return null;

    return `${u.messagesRemaining} of ${u.messagesIncluded} messages remaining`;

  }, [access.data?.usage]);



  if (access.isLoading && isAuthenticated) {

    return (

      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>

        <ActivityIndicator color={colors.primary} />

      </View>

    );

  }



  if (isAuthenticated && access.data?.hasAccess && mode !== "pricing") {

    const sub = access.data.subscription;

    return (

      <View style={[styles.activeBox, { borderColor: colors.primary, backgroundColor: colors.surface }]}>

        <Text style={{ color: colors.foreground, fontWeight: "700" }}>

          ✓ Active — {creatorName}

        </Text>

        {sub ? (

          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 18 }}>

            {sub.plan} plan · until {new Date(sub.expiresAt).toLocaleDateString()}

          </Text>

        ) : null}

        {activeUsageLine ? (

          <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4, fontWeight: "600" }}>

            {activeUsageLine}

          </Text>

        ) : null}

        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 6, lineHeight: 15 }}>

          Text chat & learn included · Voice/video requires Talk Time · Hive uses 3 messages each · 10 web searches/day

        </Text>

        {(access.data?.usage?.messagesRemaining ?? 999) <= 10 ? (
          <UsageUpgradePanel
            productId="search-web"
            creatorId={creatorId}
            title="Need more messages or searches?"
          />
        ) : null}

      </View>

    );

  }

  const activeStatusBanner =
    mode === "pricing" && isAuthenticated && access.data?.hasAccess ? (
      <View style={[styles.activeBox, { borderColor: colors.primary, backgroundColor: colors.surface, marginBottom: 10 }]}>
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>✓ Subscribed to {creatorName}</Text>
        {access.data.subscription ? (
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
            {access.data.subscription.plan} plan · renew or extend below
          </Text>
        ) : null}
        {activeUsageLine ? (
          <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4, fontWeight: "600" }}>
            {activeUsageLine}
          </Text>
        ) : null}
      </View>
    ) : null;



  if (compact) return null;



  return (

    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>

      {activeStatusBanner}

      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>

        Subscribe to {creatorName}

      </Text>

      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 19 }}>

        Standard from $7.99/day · $15.99/week · $24.99/month — per specialist. Web browser checkout required.

        {tierLabel && tierLabel !== "Standard" ? ` (${tierLabel} usage tier.)` : null}

      </Text>



      <PaymentChannelNotice compact />



      <BillingStatePicker value={stateCode} onChange={setStateCode} />



      {hasState && planList.length > 0 ? (
        <AiHubTabRow
          tabs={planList.map((p) => ({
            id: p.plan,
            label: p.priceDisplay,
            emoji: p.plan === "day" ? "⏱️" : p.plan === "week" ? "📅" : "🗓️",
          }))}
          activeId={selectedPlan}
          onSelect={(id) => {
            setSelectedPlan(id as AiSubscriptionPlan);
            setLastReceipt(null);
          }}
          style={{ paddingHorizontal: 0 }}
        />
      ) : null}

      {hasState ? (

        <View style={styles.planRow}>

          {planList.map((p) => {

            const active = selectedPlan === p.plan;

            const planSummary = buildSubscriptionPurchaseSummary({

              creatorId,

              creatorName,

              plan: p.plan,

              tier: tier!,

              tierLabel: tierLabel!,

              stateCode,

            });

            return (

              <Pressable

                key={p.plan}

                onPress={() => {

                  setSelectedPlan(p.plan);

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

                {p.messagesIncluded ? (

                  <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4, textAlign: "center" }}>

                    {formatAllowanceHeadline(creatorId, p.plan)}

                  </Text>

                ) : null}

                {p.savingsVsDaily ? (

                  <Text style={{ color: colors.muted, fontSize: 9, marginTop: 2 }}>{p.savingsVsDaily}</Text>

                ) : null}

                <Text style={{ color: colors.muted, fontSize: 9, marginTop: 4, textAlign: "center" }}>

                  Total {planSummary.pricing.totalDisplay} incl. tax & fees

                </Text>

              </Pressable>

            );

          })}

        </View>

      ) : null}



      {selectedSummary ? <PurchaseSummaryCard summary={selectedSummary} /> : null}



      <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8 }}>

        By paying you agree: AI access is non-refundable. Harassment on UR = revoked privileges, no refund. See Profile → Terms of Use.

      </Text>



      <Pressable

        disabled={purchase.isPending || !selectedPlan || !isAuthenticated || !selectedSummary || !hasState}

        onPress={() => {

          if (!isAuthenticated || !selectedPlan || !stateCode) return;

          if (!isWebCheckout) {

            void openWebBrowserCheckout(buildAiSubscriptionWebPath(creatorId));

            return;

          }

          purchase.mutate({ creatorId, plan: selectedPlan, stateCode, clientPlatform: "web" });

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

          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>

            {!hasState

              ? "Select your state to continue"

              : isAuthenticated

                ? isWebCheckout

                  ? `I understand — pay ${selectedSummary?.pricing.totalDisplay ?? ""}`

                  : "Continue in browser to subscribe"

                : "Sign in to subscribe"}

          </Text>

        )}

      </Pressable>



      {purchase.isSuccess && lastReceipt ? (

        <View style={[styles.successBox, { borderColor: colors.primary }]}>

          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Purchase confirmed</Text>

          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>

            {purchase.data?.message}

          </Text>

        </View>

      ) : null}



      {purchase.error ? (

        <Text style={{ color: "#e55", fontSize: 12, marginTop: 8 }}>{purchase.error.message}</Text>

      ) : null}

    </View>

  );

}



const styles = StyleSheet.create({

  box: {

    borderWidth: 1,

    borderRadius: 12,

    padding: 14,

    marginBottom: 12,

  },

  activeBox: {

    borderWidth: 1,

    borderRadius: 10,

    padding: 10,

    marginBottom: 10,

  },

  planRow: {

    flexDirection: "row",

    gap: 8,

    marginTop: 14,

    flexWrap: "wrap",

  },

  planCard: {

    flex: 1,

    minWidth: 90,

    borderWidth: 1,

    borderRadius: 10,

    padding: 10,

    alignItems: "center",

  },

  cta: {

    marginTop: 14,

    borderRadius: 10,

    padding: 14,

    alignItems: "center",

  },

  successBox: {

    borderWidth: 1,

    borderRadius: 8,

    padding: 10,

    marginTop: 10,

  },

});


