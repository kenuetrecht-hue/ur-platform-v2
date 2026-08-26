import { useMemo, useState } from "react";

import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";

import { useColors } from "@/hooks/use-colors";

import { trpc } from "@/lib/trpc";

import { useAuth } from "@/lib/auth-context";

import type { AiTalkPackId } from "@/lib/ai-talk-pricing";
import { listTalkPacksForPlatform } from "@/lib/ai-talk-pricing";

import { buildTalkPurchaseSummary, type PurchaseSummary } from "@/lib/pricing-disclosures";

import { PurchaseSummaryCard } from "@/components/purchase-summary-card";

import { BillingStatePicker } from "@/components/billing-state-picker";

import { useBillingState } from "@/hooks/use-billing-state";

import { PaymentChannelNotice } from "@/components/payment-channel-notice";

import { getClientPlatform } from "@/lib/web-checkout";

import {
  AI_TALK_EXPIRY_PURCHASE_DISCLOSURE,
  AI_TALK_EXPIRY_TRACKER_HEADLINE,
  AI_TALK_METERING_DISCLOSURE,
} from "@/lib/ai-talk-time-policy";
import { AiTalkTimeTracker } from "@/components/ai-talk-time-tracker";
import {
  AI_METERING_PAYBACK_PROTECTION,
  AI_METERING_RESUME_DISCLOSURE,
  AI_TEXT_METERING_DISCLOSURE,
} from "@/lib/ai-metering-policy";



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

  const clientPlatform = getClientPlatform();

  const [selectedPack, setSelectedPack] = useState<AiTalkPackId>(
    clientPlatform === "web" ? "talk_1" : "talk_5",
  );

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
      void utils.usageCredits.getMyTracker.invalidate();

    },

  });



  const minutesLeft = status.data?.minutesRemaining ?? 0;
  const msLeft = status.data?.millisecondsRemaining ?? minutesLeft * 60_000;
  const timeDisplay = status.data?.timeRemainingDisplay;
  const timeVerbose = status.data?.timeRemainingVerbose;
  const trackerLots = status.data?.trackerLots ?? [];
  const purchasedTrackerLots = purchase.data?.trackerLots ?? trackerLots;

  const hasTalk = isAuthenticated && (status.data?.hasTalkAccess ?? false);

  const packs = (plans.data?.packs ?? []) as PackOption[];

  const visiblePacks = packs.filter((pack) =>
    listTalkPacksForPlatform(clientPlatform).some((allowed) => allowed.id === pack.id),
  );



  const selectedSummary = useMemo(() => {

    if (!hasState) return null;

    return buildTalkPurchaseSummary(selectedPack, stateCode);

  }, [hasState, selectedPack, stateCode]);



  if (compact && hasTalk && !showPurchase) {
    if (trackerLots.length > 0) {
      return (
        <AiTalkTimeTracker
          compact
          lots={trackerLots}
          totalRemainingDisplay={timeDisplay ?? `${minutesLeft} min`}
          millisecondsRemaining={msLeft}
        />
      );
    }
    return (
      <View style={[styles.balance, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
          🎙️ {timeDisplay ?? `${minutesLeft} min`} left · use within 30 days or it is lost
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

      <PaymentChannelNotice compact />

      <View style={[styles.expiryBox, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}>
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>
          {AI_TALK_EXPIRY_TRACKER_HEADLINE}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
          {AI_TALK_EXPIRY_PURCHASE_DISCLOSURE}
        </Text>
      </View>

      <View style={[styles.expiryBox, { borderColor: colors.border, backgroundColor: colors.background, marginTop: 8 }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 12 }}>
          Disconnect-safe metering
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
          {AI_TALK_METERING_DISCLOSURE} {AI_METERING_RESUME_DISCLOSURE}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6, lineHeight: 16 }}>
          {AI_TEXT_METERING_DISCLOSURE} {AI_METERING_PAYBACK_PROTECTION}
        </Text>
      </View>

      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 17 }}>

        Voice & video with {creatorName ?? "AI specialists"}. 25¢/min reference · $1 = 5 min · $5 = 25 min (app) · $120 = 500 min (web) · $200 = 1,000 min (web).
        Loyalty points cost more: 250 LP = 1 min · 500 LP = 2 min. Paying cash is the better deal.
        Every second of AI speech is tracked.

      </Text>



      {hasTalk && trackerLots.length > 0 ? (
        <AiTalkTimeTracker
          lots={trackerLots}
          totalRemainingDisplay={timeDisplay ?? `${minutesLeft} min`}
          totalRemainingVerbose={
            timeVerbose ??
            `${timeDisplay ?? `${minutesLeft} min`} remaining (${msLeft.toLocaleString()} ms)`
          }
          millisecondsRemaining={msLeft}
        />
      ) : hasTalk ? (
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13, marginTop: 10 }}>
          Balance: {timeDisplay ?? `${minutesLeft} min`} ({msLeft.toLocaleString()} ms) remaining — use within 30 days or you lose what isn't used
        </Text>
      ) : null}



      <BillingStatePicker value={stateCode} onChange={setStateCode} />



      {hasState ? (

        <View style={styles.packRow}>

          {visiblePacks.map((pack) => {

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

          purchase.mutate({ packId: selectedPack, stateCode, clientPlatform });

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

                ? `I understand unused time is lost after 30 days — pay ${selectedSummary?.pricing.totalDisplay ?? ""}`

                : "Sign in to buy talk time"}

          </Text>

        )}

      </Pressable>



      {purchase.isSuccess && lastReceipt ? (

        <View style={[styles.successBox, { borderColor: colors.primary }]}>

          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Purchase confirmed</Text>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 12, marginTop: 6, lineHeight: 17 }}>
            {purchase.data?.expiryHeadline ?? AI_TALK_EXPIRY_TRACKER_HEADLINE}
          </Text>
          {purchase.data?.useByWarning ? (
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12, marginTop: 4, lineHeight: 17 }}>
              This purchase: {purchase.data.useByWarning}
            </Text>
          ) : null}
          {purchasedTrackerLots.length > 0 ? (
            <AiTalkTimeTracker
              lots={purchasedTrackerLots}
              totalRemainingDisplay={purchase.data?.timeRemainingDisplay ?? timeDisplay}
              totalRemainingVerbose={purchase.data?.timeRemainingVerbose ?? timeVerbose}
              millisecondsRemaining={purchase.data?.millisecondsRemaining ?? msLeft}
            />
          ) : null}

          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>

            {purchase.data?.message}

          </Text>

          {purchase.data?.purchaseDisclosures?.map((line) => (

            <Text key={line} style={{ color: colors.muted, fontSize: 10, marginTop: 4, lineHeight: 15 }}>

              • {line}

            </Text>

          ))}

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

  expiryBox: {

    borderWidth: 1,

    borderRadius: 8,

    padding: 10,

    marginTop: 10,

  },

});


