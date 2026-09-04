import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Share } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatWorldUsd } from "@/lib/ur-world-economy";
import { getClientPlatform, openWebBrowserCheckout } from "@/lib/web-checkout";
import { NoRefundPurchaseAck } from "@/components/no-refund-purchase-ack";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { calculateCustomerCheckout } from "@/lib/stripe-checkout-pricing";
import type { UsStateCode } from "@/lib/us-state-taxes";

function closerSourceLabel(source: string): string {
  return source === "apparel_cut" ? "from a clothing pack" : "with a tip";
}

export function UrWorldLookFundPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [acceptedNoRefund, setAcceptedNoRefund] = useState(false);
  const [billingState, setBillingState] = useState<UsStateCode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const board = trpc.urWorld.lookFund.useQuery();
  const tip = trpc.urWorld.leaveLookTip.useMutation({
    onSuccess: async (res) => {
      setNotice(res.notice);
      await utils.urWorld.lookFund.invalidate();
    },
    onError: (e) => setNotice(e.message),
  });

  const data = board.data;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Plaza look tips</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        {data?.purpose ??
          "Leave a tip to help grow UR Platform. Better rooms, more people stay. Not a charity. Not an investment."}
      </Text>
      <Text style={[styles.body, { color: colors.muted, marginTop: 6 }]}>{data?.apparelLine}</Text>

      {board.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} /> : null}

      {data ? (
        <>
          <Text style={[styles.total, { color: colors.foreground }]}>
            Tips in so far {formatWorldUsd(data.raisedCents)}
          </Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            {data.currentLevelComplete
              ? "This plaza look is funded. We keep accepting tips for the next scene — a new place to go. Hitting a bar is still not an automatic buy."
              : `Filling Plan ${data.fillingStageId} next. Hitting a bar is not an automatic buy — the owner still purchases the art.`}
          </Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            {data.nextSceneLine ??
              "When this level is done, tips keep going toward the next scene. Every spend stays public so you know where your tips went."}
          </Text>

          {data.stages.map((stage) => (
            <View key={stage.id} style={[styles.stage, { borderColor: colors.border }]}>
              <Text style={{ color: colors.foreground, fontWeight: "800" }}>{stage.name}</Text>
              <Text style={[styles.body, { color: colors.muted, marginTop: 4 }]}>{stage.rangeLabel}</Text>
              <Text style={[styles.body, { color: colors.muted }]}>{stage.unlocks}</Text>
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${stage.percent}%` as `${number}%`,
                      backgroundColor: stage.funded ? colors.primary : colors.secondary,
                    },
                  ]}
                />
              </View>
              <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700", marginTop: 4 }}>
                {formatWorldUsd(stage.filledCents)} of {formatWorldUsd(stage.targetCents)} · {stage.percent}%
                {stage.funded ? " · funded" : ` · ${formatWorldUsd(stage.remainingCents)} to go`}
              </Text>
              {stage.funded && stage.closer ? (
                <Text style={[styles.body, { color: colors.foreground, marginTop: 4 }]}>
                  Plan {stage.id} crossed thanks to {stage.closer.displayName} {closerSourceLabel(stage.closer.source)} on{" "}
                  {stage.closer.at.slice(0, 10)}.
                </Text>
              ) : null}
            </View>
          ))}

          {data.stretchCents > 0 ? (
            <Text style={[styles.body, { color: colors.muted }]}>
              Extra beyond this plaza look: {formatWorldUsd(data.stretchCents)} already going toward the next scene (still a
              tip — still not an investment).
            </Text>
          ) : null}

          <Text style={[styles.title, { color: colors.foreground, marginTop: 4 }]}>What the money bought</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            {data.receiptLine ??
              "When a goal is hit and UR buys the art, we post what it was spent on and what upgrade went live."}
          </Text>
          {(data.spendReports?.length ?? 0) === 0 ? (
            <Text style={[styles.body, { color: colors.muted }]}>
              No spend yet. Funded bars wait on the owner to buy — then the receipt lands here.
            </Text>
          ) : (
            data.spendReports.map((row) => (
              <View key={row.id} style={[styles.stage, { borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontWeight: "800" }}>
                  Plan {row.stageId} · {formatWorldUsd(row.spentCents)} · {row.at.slice(0, 10)}
                </Text>
                <Text style={[styles.body, { color: colors.foreground, marginTop: 4 }]}>Spent on: {row.bought}</Text>
                <Text style={[styles.body, { color: colors.foreground }]}>Upgrade live: {row.upgrade}</Text>
              </View>
            ))
          )}

          <Text style={[styles.title, { color: colors.foreground, marginTop: 4 }]}>This week’s thank-you</Text>
          {data.weeklyTop.length === 0 ? (
            <Text style={[styles.body, { color: colors.muted }]}>No tips yet this week. First three names go here.</Text>
          ) : (
            data.weeklyTop.map((row, i) => (
              <Text key={`${row.displayName}-${i}`} style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>
                {i + 1}. {row.displayName} · {formatWorldUsd(row.cents)}
              </Text>
            ))
          )}

          <Text style={[styles.title, { color: colors.foreground, marginTop: 4 }]}>Your tipper badges</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            {data.me?.license ??
              "Little stickers for socials and creator pages. Tipper, not a donor. Not a charity certificate."}
          </Text>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 14 }}>
            Status: {data.me?.status?.name ?? "Plaza guest"}
            {data.me?.lifetimeCents ? ` · ${formatWorldUsd(data.me.lifetimeCents)} tipped` : ""}
          </Text>
          {data.me?.status?.blurb ? (
            <Text style={[styles.body, { color: colors.muted }]}>{data.me.status.blurb}</Text>
          ) : (
            <Text style={[styles.body, { color: colors.muted }]}>Leave a tip to unlock your first sticker.</Text>
          )}
          {data.me?.next ? (
            <Text style={[styles.body, { color: colors.muted }]}>
              Next: {data.me.next.name} at {formatWorldUsd(data.me.next.minCents)}.
            </Text>
          ) : null}
          <View style={styles.tipRow}>
            {(data.me?.chips ?? []).map((chip) => (
              <View
                key={chip.id}
                style={[
                  styles.badgeChip,
                  {
                    borderColor: chip.unlocked ? colors.primary : colors.border,
                    opacity: chip.unlocked ? 1 : 0.45,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>{chip.mark}</Text>
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 11 }}>{chip.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 10 }}>{chip.unlocked ? chip.hint : "Locked"}</Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => {
              const caption = data.me?.shareCaption;
              if (!caption) return;
              void (async () => {
                try {
                  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(caption);
                    setNotice("Caption copied. Paste it on socials or your creator page. It says tipper, not donor.");
                    return;
                  }
                  await Share.share({ message: caption, title: "UR World tipper" });
                } catch {
                  setNotice("Could not share just now. Copy the caption from the board after a refresh.");
                }
              })();
            }}
            style={[styles.tipBtn, { backgroundColor: colors.secondary, minWidth: 160 }]}
            disabled={!data.me?.status}
          >
            <Text style={styles.tipBtnText}>
              {Platform.OS === "web" ? "Copy share caption" : "Share tipper badge"}
            </Text>
          </Pressable>

          <NoRefundPurchaseAck checked={acceptedNoRefund} onToggle={() => setAcceptedNoRefund((v) => !v)} />
          <BillingStatePicker value={billingState} onChange={setBillingState} />

          <View style={styles.tipRow}>
            {data.chipPacks.map((pack) => (
              <Pressable
                key={pack.id}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    void openWebBrowserCheckout("/world");
                    return;
                  }
                  if (!acceptedNoRefund) {
                    setNotice("Check the no-refund box before tipping.");
                    return;
                  }
                  if (!billingState) {
                    setNotice("Select your billing state so tax and the card fee go on your card.");
                    return;
                  }
                  tip.mutate({
                    packId: pack.id as "look_2" | "look_10" | "look_25" | "look_50" | "look_100",
                    clientPlatform: getClientPlatform(),
                    acceptedNoRefund: true,
                    billingStateCode: billingState,
                  });
                }}
                disabled={tip.isPending || (!acceptedNoRefund && Platform.OS === "web")}
                style={[
                  styles.tipBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: !acceptedNoRefund && Platform.OS === "web" ? 0.55 : 1,
                  },
                ]}
              >
                {tip.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.tipBtnText}>
                    {Platform.OS === "web"
                      ? billingState
                        ? `${pack.label} · ${calculateCustomerCheckout(pack.priceCents, billingState).totalDisplay}`
                        : pack.label
                      : "Tip in browser"}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {notice ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>{notice}</Text> : null}
      {data?.footer ? (
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8, lineHeight: 16 }}>{data.footer}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  title: { fontWeight: "800", fontSize: 15 },
  body: { fontSize: 12, lineHeight: 18 },
  total: { fontWeight: "800", fontSize: 16, marginTop: 4 },
  stage: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 2 },
  track: { height: 10, borderRadius: 999, overflow: "hidden", marginTop: 8 },
  fill: { height: 10, borderRadius: 999 },
  tipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  tipBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minWidth: 88, alignItems: "center" },
  tipBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  badgeChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 96,
    gap: 2,
  },
});
