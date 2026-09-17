import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { getClientPlatform, openExternalCheckoutUrl, openWebBrowserCheckout } from "@/lib/web-checkout";
import { NoRefundPurchaseAck } from "@/components/no-refund-purchase-ack";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { creatorTipCheckout, type CreatorTipPackId } from "@/lib/creator-tips";
import type { UsStateCode } from "@/lib/us-state-taxes";

const TIP_WEB_PATH = "/(tabs)/messages";

export function CreatorTipButton({
  creatorUserId,
  creatorName,
}: {
  creatorUserId: string;
  creatorName?: string;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [acceptedNoRefund, setAcceptedNoRefund] = useState(false);
  const [billingState, setBillingState] = useState<UsStateCode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const catalog = trpc.creatorTips.catalog.useQuery(undefined, { enabled: open });
  const send = trpc.creatorTips.send.useMutation({
    onSuccess: (res) => {
      if ("checkoutUrl" in res && res.checkoutUrl) {
        void openExternalCheckoutUrl(res.checkoutUrl);
      }
      setNotice(res.notice);
    },
    onError: (e) => setNotice(e.message),
  });

  return (
    <View>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.tipBtn} hitSlop={4}>
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>
          {open ? "Hide" : "Coffee"}
        </Text>
      </Pressable>
      {open ? (
        <View style={[styles.sheet, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>
            Buy {creatorName ?? "this creator"} a coffee
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
            {catalog.data?.purpose ??
              "If you'd like to buy this creator a coffee. They keep 100%. You pay the card fee on top."}
          </Text>
          <NoRefundPurchaseAck checked={acceptedNoRefund} onToggle={() => setAcceptedNoRefund((v) => !v)} />
          <BillingStatePicker value={billingState} onChange={setBillingState} />
          <View style={styles.row}>
            {(catalog.data?.packs ?? []).map((pack) => {
              const quote = creatorTipCheckout(pack.priceCents, billingState);
              return (
              <Pressable
                key={pack.id}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    void openWebBrowserCheckout(TIP_WEB_PATH);
                    return;
                  }
                  if (!acceptedNoRefund) {
                    setNotice("Check the no-refund box before sending coffee.");
                    return;
                  }
                  if (!billingState) {
                    setNotice("Select your billing state so tax and the card fee go on your card.");
                    return;
                  }
                  send.mutate({
                    creatorUserId,
                    packId: pack.id as CreatorTipPackId,
                    clientPlatform: getClientPlatform(),
                    acceptedNoRefund: true,
                    billingStateCode: billingState,
                  });
                }}
                disabled={send.isPending || (!acceptedNoRefund && Platform.OS === "web")}
                style={[
                  styles.pack,
                  {
                    backgroundColor: colors.primary,
                    opacity: !acceptedNoRefund && Platform.OS === "web" ? 0.55 : 1,
                  },
                ]}
              >
                {send.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.packLabel}>{pack.label}</Text>
                    <Text style={styles.packFee}>
                      {Platform.OS === "web"
                        ? billingState
                          ? `You pay ${quote.chargeLabel}`
                          : "Pick state for tax"
                        : "Coffee in browser"}
                    </Text>
                  </>
                )}
              </Pressable>
              );
            })}
          </View>
          {notice ? <Text style={{ color: colors.muted, fontSize: 11 }}>{notice}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tipBtn: { paddingVertical: 4 },
  sheet: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8, marginTop: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pack: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, minWidth: 88, alignItems: "center" },
  packLabel: { color: "#fff", fontWeight: "800", fontSize: 13 },
  packFee: { color: "#fff", fontSize: 10, opacity: 0.9, marginTop: 2 },
});
