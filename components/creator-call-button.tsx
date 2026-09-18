import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { getClientPlatform, openExternalCheckoutUrl, openWebBrowserCheckout } from "@/lib/web-checkout";
import { NoRefundPurchaseAck } from "@/components/no-refund-purchase-ack";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { formatCallPriceCents } from "@/lib/creator-call-pricing";
import type { UsStateCode } from "@/lib/us-state-taxes";

const CALL_WEB_PATH = "/(tabs)/messages";

export function CreatorCallButton({
  creatorUserId,
  creatorName,
  onCallStarted,
}: {
  creatorUserId: string;
  creatorName?: string;
  onCallStarted?: (roomId: string, creatorUserId: string) => void;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [acceptedNoRefund, setAcceptedNoRefund] = useState(false);
  const [billingState, setBillingState] = useState<UsStateCode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const offer = trpc.social.creatorCallOffer.useQuery(
    { creatorUserId },
    { enabled: open || Boolean(creatorUserId) },
  );
  const start = trpc.social.startCreatorCall.useMutation({
    onSuccess: (room) => onCallStarted?.(room.id, creatorUserId),
  });
  const buy = trpc.social.buyCreatorCall.useMutation({
    onSuccess: (res) => {
      if ("checkoutUrl" in res && res.checkoutUrl) {
        void openExternalCheckoutUrl(res.checkoutUrl);
      }
      if ("roomId" in res && res.roomId) {
        onCallStarted?.(res.roomId, creatorUserId);
      }
      setNotice(res.notice);
    },
    onError: (e) => setNotice(e.message),
  });

  const priceCents = offer.data?.priceCents ?? null;
  if (offer.data && (!offer.data.enrolled || priceCents == null)) {
    return null;
  }

  return (
    <View>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.callBtn} hitSlop={4}>
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>
          {open ? "Hide" : priceCents != null ? `Call · ${formatCallPriceCents(priceCents)}` : "Call"}
        </Text>
      </Pressable>
      {open ? (
        <View style={[styles.sheet, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>
            1-to-1 video call with {creatorName ?? offer.data?.displayName ?? "this creator"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
            They set this price. Stripe holds it on your card, then charges only after you both
            connect. Time is tracked to the millisecond. They keep 85%. UR keeps 15%. Tax and the
            card fee go on your card.
          </Text>
          <NoRefundPurchaseAck checked={acceptedNoRefund} onToggle={() => setAcceptedNoRefund((v) => !v)} />
          <BillingStatePicker value={billingState} onChange={setBillingState} />
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                start.mutate(
                  { creatorUserId },
                  {
                    onError: () => {
                      void openWebBrowserCheckout(`${CALL_WEB_PATH}?creatorCall=pay&creator=${encodeURIComponent(creatorUserId)}`);
                    },
                  },
                );
                return;
              }
              if (!acceptedNoRefund) {
                setNotice("Check the no-refund box before paying for the call.");
                return;
              }
              if (!billingState) {
                setNotice("Select your billing state so tax and the card fee go on your card.");
                return;
              }
              buy.mutate({
                creatorUserId,
                clientPlatform: getClientPlatform(),
                acceptedNoRefund: true,
                billingStateCode: billingState,
              });
            }}
            style={[styles.payBtn, { backgroundColor: colors.primary }]}
          >
            {buy.isPending || start.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payText}>
                Pay {priceCents != null ? formatCallPriceCents(priceCents) : ""} and call
              </Text>
            )}
          </Pressable>
          {notice ? <Text style={{ color: colors.muted, fontSize: 11 }}>{notice}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  callBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  sheet: { marginTop: 8, borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, maxWidth: 320 },
  payBtn: { borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  payText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
