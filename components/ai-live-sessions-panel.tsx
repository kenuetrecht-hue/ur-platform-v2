import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { useBillingState } from "@/hooks/use-billing-state";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { PurchaseSummaryCard } from "@/components/purchase-summary-card";
import { buildLiveClassPurchaseSummary } from "@/lib/pricing-disclosures";

export type AiLiveSessionsPanelProps = {
  creatorId: string;
  creatorName: string;
};

export function AiLiveSessionsPanel({ creatorId, creatorName }: AiLiveSessionsPanelProps) {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { stateCode, setStateCode, hasState } = useBillingState();
  const utils = trpc.useUtils();
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);

  const sessions = trpc.aiLiveSessions.listUpcoming.useQuery({ creatorAiId: creatorId });
  const checkout = trpc.aiLiveSessions.createCheckout.useMutation();
  const expressInterest = trpc.aiLiveSessions.expressInterest.useMutation({
    onSuccess: () => void utils.aiLiveSessions.listUpcoming.invalidate(),
  });
  const confirm = trpc.aiLiveSessions.confirmPayment.useMutation({
    onSuccess: () => {
      void utils.aiLiveSessions.listUpcoming.invalidate();
    },
  });
  const backOut = trpc.aiLiveSessions.backOut.useMutation({
    onSuccess: () => void utils.aiLiveSessions.listUpcoming.invalidate(),
  });

  const checkoutSession = sessions.data?.find((s) => s.id === checkoutSessionId);

  const purchaseSummary = useMemo(() => {
    if (!checkoutSession || checkoutSession.priceCents === 0) return null;
    return buildLiveClassPurchaseSummary({
      sessionTitle: checkoutSession.title,
      creatorName: checkoutSession.creatorName,
      durationMinutes: checkoutSession.durationMinutes,
      priceCentsPerMinute: checkoutSession.priceCentsPerMinute,
      ticketSubtotalCents: checkoutSession.priceCents,
      minAttendeesToStart: checkoutSession.minAttendeesToStart ?? 1,
      pricingTier: checkoutSession.pricingTier ?? "standard",
      refundsOnUnderfill: checkoutSession.refundsOnUnderfill ?? false,
      ticketOnlyMinimum: checkoutSession.ticketOnlyMinimum ?? false,
      startsAt: checkoutSession.startsAt,
      stateCode: stateCode ?? null,
    });
  }, [checkoutSession, stateCode]);

  const buyTicket = async (sessionId: string, priceCents: number) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (priceCents > 0 && !hasState) {
      setCheckoutSessionId(sessionId);
      return;
    }
    setBusySessionId(sessionId);
    try {
      const result = await checkout.mutateAsync({
        sessionId,
        stateCode: priceCents > 0 ? stateCode ?? undefined : undefined,
      });
      if (result.mode === "checkout") {
        await confirm.mutateAsync({ paymentIntentId: result.paymentIntentId });
      }
      setCheckoutSessionId(null);
      router.push(`/live-session/${sessionId}`);
    } finally {
      setBusySessionId(null);
    }
  };

  if (sessions.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!sessions.data?.length) {
    return (
      <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ fontSize: 32 }}>🎥</Text>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 16 }}>
          No live sessions scheduled
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 }}>
          When {creatorName} hosts a paid video session, it will appear here. Classes are scheduled at
          least 12 hours ahead — check back soon or ask in chat about upcoming events.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 4, paddingHorizontal: 4 }}>
        Back out with a refund until 1h 30m before class. Then seats lock for 30 minutes while new sign-ups
        can fill open spots. If a group hit 25 and the 25th drops out, the 24 who wait still get the class.
      </Text>
      <BillingStatePicker value={stateCode} onChange={setStateCode} />
      {checkoutSession && checkoutSession.priceCents > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14, paddingHorizontal: 4 }}>
            Review before you pay — {checkoutSession.title}
          </Text>
          {purchaseSummary ? <PurchaseSummaryCard summary={purchaseSummary} /> : null}
          <Pressable
            disabled={!hasState || busySessionId === checkoutSession.id}
            onPress={() => buyTicket(checkoutSession.id, checkoutSession.priceCents)}
            style={[
              styles.cta,
              {
                backgroundColor: hasState ? colors.primary : colors.border,
                opacity: busySessionId === checkoutSession.id ? 0.7 : 1,
              },
            ]}
          >
            {busySessionId === checkoutSession.id ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                {hasState && purchaseSummary
                  ? `Confirm & pay ${purchaseSummary.pricing.totalDisplay}`
                  : "Select billing state to continue"}
              </Text>
            )}
          </Pressable>
          <Pressable onPress={() => setCheckoutSessionId(null)} style={{ alignItems: "center", padding: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
      {sessions.data.map((s) => (
        <LiveSessionCard
          key={s.id}
          session={s}
          colors={colors}
          isAuthenticated={isAuthenticated}
          busy={busySessionId === s.id}
          onBuy={() => {
            if (s.priceCents > 0) setCheckoutSessionId(s.id);
            else void buyTicket(s.id, 0);
          }}
          onExpressInterest={async () => {
            if (!isAuthenticated) {
              router.push("/login");
              return;
            }
            setBusySessionId(s.id);
            try {
              await expressInterest.mutateAsync({ sessionId: s.id });
            } finally {
              setBusySessionId(null);
            }
          }}
          onBackOut={async () => {
            if (!isAuthenticated) {
              router.push("/login");
              return;
            }
            setBusySessionId(s.id);
            try {
              await backOut.mutateAsync({ sessionId: s.id });
            } finally {
              setBusySessionId(null);
            }
          }}
          expressPending={expressInterest.isPending}
          backOutPending={backOut.isPending}
        />
      ))}
    </ScrollView>
  );
}

type SessionRow = NonNullable<
  ReturnType<typeof trpc.aiLiveSessions.listUpcoming.useQuery>["data"]
>[number];

type LiveSessionCardProps = {
  session: SessionRow;
  colors: ReturnType<typeof useColors>;
  isAuthenticated: boolean;
  busy: boolean;
  onBuy: () => void;
  onExpressInterest: () => void;
  onBackOut: () => void;
  expressPending: boolean;
  backOutPending: boolean;
};

function LiveSessionCard({
  session: s,
  colors,
  isAuthenticated,
  busy,
  onBuy,
  onExpressInterest,
  onBackOut,
  expressPending,
  backOutPending,
}: LiveSessionCardProps) {
  const registration = trpc.aiLiveSessions.hasTicket.useQuery(
    { sessionId: s.id },
    { enabled: isAuthenticated },
  );
  const start = new Date(s.startsAt);
  const enrollmentClose = new Date(s.enrollmentDeadlineAt);
  const backoutClose = new Date(s.backoutDeadlineAt);
  const soldOut = s.spotsLeft <= 0;
  const cancelledMin = s.enrollmentStatus === "cancelled_insufficient";
  const salesClosed = !s.enrollmentOpen;
  const isPaid = s.priceCents > 0;
  const hasRegistration =
    registration.data?.hasTicket || registration.data?.hasInterest;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.badgeRow}>
        <Text
          style={[
            styles.badge,
            {
              backgroundColor:
                s.status === "live"
                  ? "#e74c3c"
                  : cancelledMin
                    ? `${colors.muted}44`
                    : s.inFillWindow
                      ? "#f39c1222"
                      : `${colors.primary}22`,
              color:
                s.status === "live"
                  ? "#fff"
                  : cancelledMin
                    ? colors.muted
                    : s.inFillWindow
                      ? "#d68910"
                      : colors.primary,
            },
          ]}
        >
          {s.status === "live"
            ? "LIVE NOW"
            : cancelledMin
              ? "CANCELLED"
              : s.inFillWindow
                ? "FILL WINDOW"
                : s.confirmedToRun
                  ? "CONFIRMED"
                  : salesClosed
                    ? "SIGN-UPS CLOSED"
                    : "GATHERING"}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>
          {s.durationMinutes} min · {s.registeredCount ?? s.attendeeCount} registered
          {(s.minAttendeesToStart ?? 1) > 1 ? ` · need ${s.minAttendeesToStart}` : ""}
        </Text>
      </View>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>{s.title}</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }} numberOfLines={3}>
        {s.description}
      </Text>
      {s.enrollmentLabel ? (
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>{s.enrollmentLabel}</Text>
      ) : null}
      {s.backoutOpen ? (
        <Text style={{ color: colors.muted, fontSize: 11 }}>
          Back-out with refund until {backoutClose.toLocaleString()}
        </Text>
      ) : s.inFillWindow ? (
        <Text style={{ color: colors.muted, fontSize: 11 }}>
          Seats locked — last-minute sign-ups open until {enrollmentClose.toLocaleString()}
        </Text>
      ) : !cancelledMin && s.enrollmentOpen ? (
        <Text style={{ color: colors.muted, fontSize: 11 }}>
          Sign-ups close {enrollmentClose.toLocaleString()} (1 hour before class)
        </Text>
      ) : null}
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>
        Committed: {s.committedDurationLabel ?? `${s.durationMinutes} min`} — host stays for the full time
      </Text>
      <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 4 }}>
        📅 {start.toLocaleString()} · 💵 ${s.pricePerMinuteUsd}/min · ${s.priceUsd} ticket subtotal · up to{" "}
        {s.maxAttendees.toLocaleString()} seats
      </Text>
      {isPaid ? (
        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
          Taxes and Stripe fees added at checkout. Locked seats are non-refundable after 1h 30m before start.
        </Text>
      ) : null}
      {hasRegistration && s.backoutOpen ? (
        <Pressable
          disabled={busy || backOutPending}
          onPress={onBackOut}
          style={[styles.cta, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={[styles.ctaText, { color: colors.foreground }]}>
            Back out & release seat (refund if paid)
          </Text>
        </Pressable>
      ) : null}
      {!hasRegistration ? (
        <Pressable
          disabled={busy || soldOut || s.status === "ended" || cancelledMin || salesClosed}
          onPress={onBuy}
          style={[
            styles.cta,
            {
              backgroundColor: soldOut || cancelledMin || salesClosed ? colors.border : colors.primary,
              opacity: busy ? 0.7 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>
              {cancelledMin
                ? "Class cancelled — minimum not met"
                : salesClosed
                  ? "Sign-ups closed"
                  : soldOut
                    ? "Sold out"
                    : isPaid
                      ? s.inFillWindow
                        ? "Join now — fill window"
                        : "Review rules & buy ticket"
                      : "Reserve free seat"}
            </Text>
          )}
        </Pressable>
      ) : null}
      {!cancelledMin &&
      !soldOut &&
      s.status !== "ended" &&
      !s.ticketOnlyMinimum &&
      s.enrollmentOpen &&
      !registration.data?.hasTicket ? (
        <Pressable
          disabled={busy || expressPending}
          onPress={onExpressInterest}
          style={[styles.cta, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={[styles.ctaText, { color: colors.foreground }]}>
            Save my spot (free — counts toward minimum)
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  empty: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  list: { padding: 12, gap: 12, paddingBottom: 32 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { fontSize: 10, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: "hidden" },
  cta: { borderRadius: 10, padding: 14, alignItems: "center", marginTop: 4 },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
