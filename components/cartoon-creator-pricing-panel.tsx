import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useBillingState } from "@/hooks/use-billing-state";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { NoRefundPurchaseAck } from "@/components/no-refund-purchase-ack";
import { PurchaseSummaryCard } from "@/components/purchase-summary-card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { getClientPlatform, openWebBrowserCheckout } from "@/lib/web-checkout";
import {
  CARTOON_CREATOR_BILLING_NOTES,
  CARTOON_CREATOR_PAY_FIRST_RULE,
  CARTOON_CREATOR_PLANS,
  CARTOON_CREATOR_PRICING_SUMMARY,
  type CartoonCreatorPlanId,
} from "@/lib/cartoon-creator-pricing";
import { CARTOON_STUDIO_WEB_PATH } from "@/lib/cartoon-studio-pricing";
import { buildCartoonCreatorPurchaseSummary } from "@/lib/pricing-disclosures";
import { usePlatformOwner } from "@/lib/use-platform-owner";

export function CartoonCreatorPricingPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const { isAuthenticated } = useAuth();
  const { isPlatformOwner } = usePlatformOwner();
  const { stateCode, setStateCode, hasState } = useBillingState();
  const clientPlatform = getClientPlatform();
  const [planId, setPlanId] = useState<CartoonCreatorPlanId>("channel");
  const [acceptedNoRefund, setAcceptedNoRefund] = useState(false);

  const catalog = trpc.cartoonStudio.creatorPlans.useQuery();
  const purchase = trpc.cartoonStudio.purchaseCreatorPlan.useMutation({
    onSuccess: () => {
      setAcceptedNoRefund(false);
      void utils.cartoonStudio.creatorPlans.invalidate();
      void utils.cartoonStudio.published.invalidate();
    },
  });

  const selected = CARTOON_CREATOR_PLANS.find((plan) => plan.id === planId) ?? CARTOON_CREATOR_PLANS[0]!;
  const summary = useMemo(
    () => (hasState ? buildCartoonCreatorPurchaseSummary({ planId, stateCode }) : null),
    [hasState, planId, stateCode],
  );
  const status = catalog.data?.status;
  const mustUseWeb = clientPlatform === "native" && !isPlatformOwner;

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
        Cartoon Me Creator Platform
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{CARTOON_CREATOR_PAY_FIRST_RULE}</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{CARTOON_CREATOR_PRICING_SUMMARY}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        If you charge $3.99/month and have 200,000–300,000 fans, that is about $798,000–$1.2 million a month.
        Network at $399.99 is a platform tool, not a threat to that income.
      </Text>

      {status?.complimentary ? (
        <Text style={{ color: colors.primary, fontWeight: "700" }}>
          Owner complimentary — hosting and Cartoon Me live are on. No card.
        </Text>
      ) : status?.canHost ? (
        <Text style={{ color: colors.primary, fontWeight: "700" }}>
          Active: {status.liveMinutesRemaining.toLocaleString()} Cartoon Me live minutes left
          {status.expiresAt ? ` · use by ${status.expiresAt.slice(0, 10)}` : ""}
        </Text>
      ) : (
        <Text style={{ color: colors.muted, fontWeight: "700" }}>
          No platform plan yet. Pay first to host cartoons and go live as Cartoon Me.
        </Text>
      )}

      {CARTOON_CREATOR_PLANS.map((plan) => {
        const selectedPlan = plan.id === planId;
        return (
          <Pressable
            key={plan.id}
            onPress={() => setPlanId(plan.id)}
            style={{
              borderWidth: 1.5,
              borderColor: selectedPlan ? colors.primary : colors.border,
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 14,
              gap: 6,
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "800" }}>
              {plan.badge} · {plan.label}
            </Text>
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
              ${(plan.priceCents / 100).toFixed(2)} / 30 days · {plan.liveMinutes / 60} live hours
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Covered by about {plan.fansToCover} fans at $3.99/month
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{plan.usedFor}</Text>
            <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18, fontWeight: "700" }}>
              Difference: {plan.difference}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              What this cost is for: {plan.costExplained}
            </Text>
            {plan.youGet.map((item) => (
              <Text key={item} style={{ color: colors.foreground, fontSize: 12 }}>
                • {item}
              </Text>
            ))}
          </Pressable>
        );
      })}

      {CARTOON_CREATOR_BILLING_NOTES.map((note) => (
        <Text key={note} style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
          • {note}
        </Text>
      ))}
      <BillingStatePicker value={stateCode} onChange={setStateCode} />
      {summary ? (
        <PurchaseSummaryCard summary={summary} />
      ) : (
        <Text style={{ color: colors.muted, fontSize: 13 }}>Select your billing state to see tax, Stripe, and the card total.</Text>
      )}
      <NoRefundPurchaseAck checked={acceptedNoRefund} onToggle={() => setAcceptedNoRefund((value) => !value)} />

      {mustUseWeb ? (
        <Pressable
          onPress={() => void openWebBrowserCheckout(CARTOON_STUDIO_WEB_PATH)}
          style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Continue in browser to pay</Text>
        </Pressable>
      ) : (
        <Pressable
          disabled={purchase.isPending || !hasState || !acceptedNoRefund || !isAuthenticated}
          onPress={() => {
            if (!stateCode || !acceptedNoRefund) return;
            purchase.mutate({
              planId,
              stateCode,
              clientPlatform,
              acceptedNoRefund: true,
            });
          }}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
            padding: 14,
            alignItems: "center",
            opacity: purchase.isPending || !hasState || !acceptedNoRefund || !isAuthenticated ? 0.5 : 1,
          }}
        >
          {purchase.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>
              {!isAuthenticated
                ? "Sign in to pay"
                : !hasState
                  ? "Select your state to continue"
                  : !acceptedNoRefund
                    ? "Check the no-refund box to continue"
                    : `Pay ${summary?.pricing.totalDisplay ?? ""} for ${selected.label}`}
            </Text>
          )}
        </Pressable>
      )}
      {purchase.error ? <Text style={{ color: "#c0392b", fontSize: 13 }}>{purchase.error.message}</Text> : null}
      {purchase.data?.message ? <Text style={{ color: colors.muted, fontSize: 12 }}>{purchase.data.message}</Text> : null}
    </View>
  );
}
