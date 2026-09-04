import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { getClientPlatform, openWebBrowserCheckout } from "@/lib/web-checkout";
import { NoRefundPurchaseAck } from "@/components/no-refund-purchase-ack";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { AI_CREATOR_CATALOG } from "@/lib/ai-creator-catalog";
import { ThanksStampsWall } from "@/components/thanks-stamps-wall";
import type { UrThanksStampPackId } from "@/lib/ur-thanks-stamps";
import { calculateCustomerCheckout } from "@/lib/stripe-checkout-pricing";
import type { UsStateCode } from "@/lib/us-state-taxes";

const FEATURED_AIS = AI_CREATOR_CATALOG.slice(0, 6);
const THANKS_STAMPS_WEB_PATH = "/(tabs)/profile";

export function ThanksStampsPanel() {
  const colors = useColors();
  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();
  const [acceptedNoRefund, setAcceptedNoRefund] = useState(false);
  const [billingState, setBillingState] = useState<UsStateCode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [giftEmail, setGiftEmail] = useState("");
  const [placeEmail, setPlaceEmail] = useState("");
  const [note, setNote] = useState("");
  const [placeAiId, setPlaceAiId] = useState(FEATURED_AIS[0]?.id ?? "contentmate");

  const catalog = trpc.thanksStamps.catalog.useQuery(undefined, { enabled: isAuthenticated });
  const wallet = trpc.thanksStamps.wallet.useQuery(undefined, { enabled: isAuthenticated });

  const invalidate = async () => {
    await Promise.all([
      utils.thanksStamps.wallet.invalidate(),
      utils.thanksStamps.catalog.invalidate(),
      utils.thanksStamps.wall.invalidate(),
    ]);
  };

  const buy = trpc.thanksStamps.buy.useMutation({
    onSuccess: async (res) => {
      setNotice(res.notice);
      await invalidate();
    },
    onError: (e) => setNotice(e.message),
  });
  const gift = trpc.thanksStamps.gift.useMutation({
    onSuccess: async (res) => {
      setNotice(res.notice);
      setSelectedId(null);
      setGiftEmail("");
      await invalidate();
    },
    onError: (e) => setNotice(e.message),
  });
  const place = trpc.thanksStamps.place.useMutation({
    onSuccess: async (res) => {
      setNotice(res.notice);
      setSelectedId(null);
      setNote("");
      await invalidate();
    },
    onError: (e) => setNotice(e.message),
  });
  const placeOnMember = trpc.thanksStamps.placeOnMember.useMutation({
    onSuccess: async (res) => {
      setNotice(res.notice);
      setSelectedId(null);
      setPlaceEmail("");
      setNote("");
      await invalidate();
    },
    onError: (e) => setNotice(e.message),
  });

  if (!isAuthenticated) return null;

  const data = catalog.data;
  const bag = wallet.data?.items ?? [];

  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>Social stamps</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        {data?.purpose ??
          "Buy 4 stickers per $1 and use them like emojis on the feed. Gift unused once. Not a tip — creators have a separate Tip button for money."}
      </Text>

      {catalog.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} /> : null}

      {data ? (
        <>
          <Text style={[styles.section, { color: colors.foreground }]}>This week · {data.weekly.name}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{data.rotationNote}</Text>
          <View style={styles.row}>
            {data.weekly.stamps.map((stamp) => (
              <View
                key={stamp.id}
                style={[styles.stampChip, { borderColor: stamp.colorHex, backgroundColor: colors.background }]}
              >
                <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>{stamp.mark}</Text>
                <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>{stamp.name}</Text>
              </View>
            ))}
            <View style={[styles.stampChip, { borderColor: data.monthSeal.colorHex, backgroundColor: colors.background }]}>
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>{data.monthSeal.mark}</Text>
              <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>{data.monthSeal.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 10 }}>$20 / $25 packs</Text>
            </View>
          </View>

          <NoRefundPurchaseAck checked={acceptedNoRefund} onToggle={() => setAcceptedNoRefund((v) => !v)} />
          <BillingStatePicker value={billingState} onChange={setBillingState} />
          <Text style={[styles.body, { color: colors.muted }]}>
            {Platform.OS === "web"
              ? "$5 · 20 stamps is an in-app purchase in the iPhone and Android apps (Apple / Google). Other packs buy here."
              : "$5 · 20 stamps buys in this app (App Store / Google Play). Bigger packs are on the website."}
          </Text>
          <View style={styles.row}>
            {data.packs
              .filter((pack) => {
                const wanted = getClientPlatform() === "web" ? "web_browser" : "in_app";
                return pack.requiredPaymentChannel === wanted;
              })
              .map((pack) => {
                const inApp = pack.priceCents === 500;
                return (
              <Pressable
                key={pack.id}
                onPress={() => {
                  if (!inApp && Platform.OS !== "web") {
                    void openWebBrowserCheckout(THANKS_STAMPS_WEB_PATH);
                    return;
                  }
                  if (inApp && Platform.OS === "web") {
                    setNotice("The $5 stamp pack is an in-app purchase. Open the UR app on iPhone or Android.");
                    return;
                  }
                  if (!acceptedNoRefund) {
                    setNotice("Check the no-refund box before buying stamps.");
                    return;
                  }
                  if (!billingState) {
                    setNotice("Select your billing state so tax and the card fee go on your card.");
                    return;
                  }
                  buy.mutate({
                    packId: pack.id as UrThanksStampPackId,
                    clientPlatform: getClientPlatform(),
                    acceptedNoRefund: true,
                    billingStateCode: billingState,
                  });
                }}
                disabled={buy.isPending || !acceptedNoRefund}
                style={[
                  styles.buyBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: !acceptedNoRefund ? 0.55 : 1,
                  },
                ]}
              >
                {buy.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buyBtnText}>
                    {inApp
                      ? `${pack.label} · app`
                      : billingState
                        ? `${pack.label} · ${calculateCustomerCheckout(pack.priceCents, billingState).totalDisplay}`
                        : pack.label}
                  </Text>
                )}
              </Pressable>
                );
              })}
          </View>
        </>
      ) : null}

      <Text style={[styles.section, { color: colors.foreground }]}>Your unused stamps · {bag.length}</Text>
      {wallet.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {bag.length === 0 ? (
        <Text style={[styles.body, { color: colors.muted }]}>
          Buy a pack, then gift one unused stamp once, or stick it on a page.
        </Text>
      ) : (
        <View style={styles.row}>
          {bag.map((item) => (
            <Pressable
              key={item.instanceId}
              onPress={() => setSelectedId(item.instanceId)}
              style={[
                styles.stampChip,
                {
                  borderColor: selectedId === item.instanceId ? colors.primary : colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>{item.mark}</Text>
              <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>{item.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 10 }}>
                {item.giftable ? "Can gift once" : "Place only"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {selectedId ? (
        <View style={[styles.action, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
            Selected stamp — gift unused, or place it
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional note (80 chars)"
            placeholderTextColor={colors.muted}
            maxLength={80}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>Stick on an AI</Text>
          <View style={styles.row}>
            {FEATURED_AIS.map((ai) => (
              <Pressable
                key={ai.id}
                onPress={() => setPlaceAiId(ai.id)}
                style={[
                  styles.mini,
                  {
                    borderColor: placeAiId === ai.id ? colors.primary : colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>
                  {ai.avatar} {ai.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() =>
              place.mutate({
                instanceId: selectedId,
                targetType: "ai",
                targetId: placeAiId,
                note: note.trim() || undefined,
              })
            }
            disabled={place.isPending}
            style={[styles.buyBtn, { backgroundColor: colors.secondary }]}
          >
            <Text style={styles.buyBtnText}>Stick on {FEATURED_AIS.find((a) => a.id === placeAiId)?.name ?? "this AI"}</Text>
          </Pressable>

          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 8 }}>
            Stick on a content creator’s page
          </Text>
          <TextInput
            value={placeEmail}
            onChangeText={setPlaceEmail}
            placeholder="Their UR email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            maxLength={254}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable
            onPress={() => {
              if (!placeEmail.trim()) {
                setNotice("Enter their UR email to stick a stamp on their page.");
                return;
              }
              placeOnMember.mutate({
                instanceId: selectedId,
                toEmail: placeEmail.trim(),
                note: note.trim() || undefined,
              });
            }}
            disabled={placeOnMember.isPending}
            style={[styles.buyBtn, { backgroundColor: colors.secondary }]}
          >
            <Text style={styles.buyBtnText}>Stick on their page</Text>
          </Pressable>

          {bag.find((i) => i.instanceId === selectedId)?.giftable ? (
            <>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 8 }}>
                Gift unused (once)
              </Text>
              <TextInput
                value={giftEmail}
                onChangeText={setGiftEmail}
                placeholder="Friend’s UR email"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                maxLength={254}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              <Pressable
                onPress={() => {
                  if (!giftEmail.trim()) {
                    setNotice("Enter their UR email to gift this unused stamp.");
                    return;
                  }
                  gift.mutate({ instanceId: selectedId, toEmail: giftEmail.trim() });
                }}
                disabled={gift.isPending}
                style={[styles.buyBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.buyBtnText}>Gift unused stamp</Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.body, { color: colors.muted }]}>
              This stamp was already gifted. Place it on a page — it cannot be re-gifted.
            </Text>
          )}
        </View>
      ) : null}

      {notice ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>{notice}</Text> : null}

      {user?.id ? (
        <>
          <Text style={[styles.section, { color: colors.foreground }]}>Stamps on your page</Text>
          <ThanksStampsWall targetType="member" targetId={String(user.id)} compact defaultOpen />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  body: { fontSize: 12, lineHeight: 18 },
  section: { fontWeight: "800", fontSize: 13, marginTop: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  stampChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 88,
    gap: 2,
  },
  buyBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minWidth: 96, alignItems: "center" },
  buyBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  action: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  mini: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8 },
});
