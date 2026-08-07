import { useMemo, useState } from "react";

import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";

import { useColors } from "@/hooks/use-colors";

import { trpc } from "@/lib/trpc";

import { useAuth } from "@/lib/auth-context";

import type { AiTalkPackId } from "@/lib/ai-talk-pricing";

import { buildTalkPurchaseSummary, type PurchaseSummary } from "@/lib/pricing-disclosures";

import { PurchaseSummaryCard } from "@/components/purchase-summary-card";

import { BillingStatePicker } from "@/components/billing-state-picker";

import { useBillingState } from "@/hooks/use-billing-state";



type Props = {

  creatorName?: string;

  compact?: boolean;

  /** Show full purchase UI even when user has balance (for top-ups) */

  showPurchase?: boolean;

};



type PackOption = {

  id: string;

  label: string;

  priceDisplay: string;

  totalMinutes: number;

  tagline: string;

  featured?: boolean;

};



export function AiTalkTimePanel({

  creatorName,

  compact = false,

  showPurchase = false,

}: Props) {

  const colors = useColors();

  const { isAuthenticated } = useAuth();

  const { stateCode, setStateCode, hasState } = useBillingState();

  const [selectedPack, setSelectedPack] = useState<AiTalkPackId>("standard_20");

  const [lastReceipt, setLastReceipt] = useState<PurchaseSummary | null>(null);

  const utils = trpc.useUtils();



  const plans = trpc.aiTalk.getPlans.useQuery({
    stateCode: stateCode ?? undefined,
  });

  const status = trpc.aiTalk.getStatus.useQuery(undefined, { enabled: isAuthenticated });



  const purchase = trpc.aiTalk.purchase.useMutation({

    onSuccess: (data) => {

      if (data.receipt) setLastReceipt(data.receipt);

      void utils.aiTalk.getStatus.invalidate();

      void utils.partnerDashboard.premiumMediaStatus.invalidate();

      void utils.aiCreators.premiumMediaStatus.invalidate();

    },

  });



  const minutesLeft = status.data?.minutesRemaining ?? 0;

  const hasTalk = isAuthenticated && (status.data?.hasTalkAccess ?? false);

  const packs = (plans.data?.packs ?? []) as PackOption[];



  const selectedSummary = useMemo(() => {

    if (!hasState) return null;

    return buildTalkPurchaseSummary(selectedPack, stateCode);

  }, [hasState, selectedPack, stateCode]);



  if (compact && hasTalk && !showPurchase) {

    return (

      <View style={[styles.balance, { borderColor: colors.primary, backgroundColor: colors.surface }]}>

        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>

          🎙️ {minutesLeft} talk min left · 1 min per voice/video use

        </Text>

      </View>

    );

  }



  if (compact && !isAuthenticated) return null;

  if (compact && !showPurchase && !hasTalk) return null;

  if (compact && hasTalk && !showPurchase) return null;



  return (

    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>

      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>

        AI Talk Time

      </Text>

      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>

        Voice & video with {creatorName ?? "AI specialists"}. Review your minutes and cost before you pay.

      </Text>



      {hasTalk ? (

        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13, marginTop: 10 }}>

          Balance: {minutesLeft} minutes remaining (expires 30 days after purchase)

        </Text>

      ) : null}



      <BillingStatePicker value={stateCode} onChange={setStateCode} />



      {hasState ? (

        <View style={styles.packRow}>

          {packs.map((pack) => {

            const active = selectedPack === pack.id;

            const packSummary = buildTalkPurchaseSummary(pack.id as AiTalkPackId, stateCode);

            return (

              <Pressable

                key={pack.id}

                onPress={() => {

                  setSelectedPack(pack.id as AiTalkPackId);

                  setLastReceipt(null);

                }}

                style={[

                  styles.packCard,

                  {

                    borderColor: active ? colors.primary : colors.border,

                    backgroundColor: active ? `${colors.primary}18` : colors.background,

                  },

                ]}

              >

                {pack.featured ? (

                  <Text style={[styles.badge, { backgroundColor: colors.primary }]}>Best value</Text>

                ) : null}

                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>{pack.label}</Text>

                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 17, marginTop: 4 }}>

                  {pack.priceDisplay}

                </Text>

                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4, textAlign: "center" }}>

                  {pack.totalMinutes} min total

                </Text>

                <Text style={{ color: colors.muted, fontSize: 9, marginTop: 2, textAlign: "center" }}>

                  Total {packSummary.pricing.totalDisplay} incl. tax & fees

                </Text>

              </Pressable>

            );

          })}

        </View>

      ) : null}



      {selectedSummary ? <PurchaseSummaryCard summary={selectedSummary} /> : null}



      <Pressable

        disabled={purchase.isPending || !isAuthenticated || !selectedSummary || !hasState}

        onPress={() => {

          if (!isAuthenticated || !stateCode) return;

          purchase.mutate({ packId: selectedPack, stateCode });

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

          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>

            {!hasState

              ? "Select your state to continue"

              : isAuthenticated

                ? `I understand — pay ${selectedSummary?.pricing.totalDisplay ?? ""}`

                : "Sign in to buy talk time"}

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

    padding: 12,

    marginBottom: 10,

  },

  balance: {

    borderWidth: 1,

    borderRadius: 8,

    padding: 8,

    marginBottom: 8,

    alignItems: "center",

  },

  packRow: {

    flexDirection: "row",

    gap: 8,

    marginTop: 12,

    flexWrap: "wrap",

  },

  packCard: {

    flex: 1,

    minWidth: 130,

    borderWidth: 1,

    borderRadius: 10,

    padding: 10,

    alignItems: "center",

  },

  badge: {

    color: "#fff",

    fontSize: 9,

    fontWeight: "800",

    paddingHorizontal: 6,

    paddingVertical: 2,

    borderRadius: 4,

    marginBottom: 4,

    overflow: "hidden",

  },

  cta: {

    marginTop: 12,

    borderRadius: 10,

    padding: 12,

    alignItems: "center",

  },

  successBox: {

    borderWidth: 1,

    borderRadius: 8,

    padding: 10,

    marginTop: 10,

  },

});


