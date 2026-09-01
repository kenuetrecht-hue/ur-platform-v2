import { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatWorldUsd } from "@/lib/ur-world-economy";
import { UR_WORLD_COSMETIC_LICENSE } from "@/lib/ur-world-cosmetics";
import { getClientPlatform, openWebBrowserCheckout } from "@/lib/web-checkout";
import { NoRefundPurchaseAck } from "@/components/no-refund-purchase-ack";

type Owned = {
  instanceId: string;
  packId: string;
  packName: string;
  giftable: boolean;
};

type Pack = {
  id: string;
  name: string;
  tagline: string;
  district: string;
  priceCents: number;
};

export function UrWorldLockerPanel({
  catalog,
  owned,
}: {
  catalog: Pack[];
  owned: Owned[];
}) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [giftEmail, setGiftEmail] = useState("");
  const [giftTarget, setGiftTarget] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [acceptedNoRefund, setAcceptedNoRefund] = useState(false);

  const buy = trpc.urWorld.buyApparel.useMutation({
    onSuccess: async (res) => {
      setNotice(res.notice);
      await utils.urWorld.snapshot.invalidate();
    },
    onError: (e) => setNotice(e.message),
  });
  const wear = trpc.urWorld.wearApparel.useMutation({
    onSuccess: async () => {
      setNotice("You’re wearing that pack. It can no longer be gifted.");
      await utils.urWorld.snapshot.invalidate();
    },
    onError: (e) => setNotice(e.message),
  });
  const gift = trpc.urWorld.giftApparel.useMutation({
    onSuccess: async (res) => {
      setNotice(res.notice);
      setGiftTarget(null);
      setGiftEmail("");
      await utils.urWorld.snapshot.invalidate();
    },
    onError: (e) => setNotice(e.message),
  });
  const talkLots = trpc.urWorld.giftableTalk.useQuery();
  const giftTalk = trpc.urWorld.giftTalk.useMutation({
    onSuccess: async (res) => {
      setNotice(res.notice);
      setGiftEmail("");
      await utils.urWorld.giftableTalk.invalidate();
      await utils.aiTalk.getStatus.invalidate();
    },
    onError: (e) => setNotice(e.message),
  });

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Avatar locker</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        Ten looks. Cheap on purpose — they are code, not cotton. UR keeps the list price; when
        Stripe is live you still pay processing on top like other UR checkouts. Gift unused only. No
        resale.
      </Text>
      <Text style={[styles.body, { color: colors.muted, marginTop: 6 }]}>{UR_WORLD_COSMETIC_LICENSE}</Text>

      <NoRefundPurchaseAck
        checked={acceptedNoRefund}
        onToggle={() => setAcceptedNoRefund((v) => !v)}
      />

      {catalog.map((pack) => (
        <View key={pack.id} style={[styles.pack, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>{pack.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{pack.district} · {pack.tagline}</Text>
          <Text style={{ color: colors.primary, fontWeight: "700", marginTop: 4 }}>
            {formatWorldUsd(pack.priceCents)} · web
          </Text>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                void openWebBrowserCheckout("/world");
                return;
              }
              if (!acceptedNoRefund) {
                setNotice("Check the no-refund box before buying.");
                return;
              }
              buy.mutate({ packId: pack.id, clientPlatform: getClientPlatform(), acceptedNoRefund: true });
            }}
            style={[styles.btn, { backgroundColor: colors.primary, opacity: !acceptedNoRefund && Platform.OS === "web" ? 0.55 : 1 }]}
            disabled={buy.isPending || (!acceptedNoRefund && Platform.OS === "web")}
          >
            {buy.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {Platform.OS === "web" ? "Buy pack" : "Buy in browser"}
              </Text>
            )}
          </Pressable>
        </View>
      ))}

      {owned.length > 0 ? (
        <Text style={[styles.title, { color: colors.foreground, marginTop: 8 }]}>Your closet</Text>
      ) : null}
      {owned.map((item) => (
        <View key={item.instanceId} style={[styles.pack, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>{item.packName}</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            {item.giftable ? "Unused — you may gift or wear" : "Worn — yours to keep, not giftable"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pressable
              onPress={() => wear.mutate({ instanceId: item.instanceId })}
              style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}
            >
              <Text style={styles.btnText}>Wear</Text>
            </Pressable>
            {item.giftable ? (
              <Pressable
                onPress={() => setGiftTarget(item.instanceId)}
                style={[styles.btn, { backgroundColor: colors.foreground, flex: 1 }]}
              >
                <Text style={styles.btnText}>Gift</Text>
              </Pressable>
            ) : null}
          </View>
          {giftTarget === item.instanceId ? (
            <View style={{ marginTop: 8, gap: 6 }}>
              <TextInput
                value={giftEmail}
                onChangeText={setGiftEmail}
                placeholder="Their UR email"
                autoCapitalize="none"
                maxLength={254}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              <Pressable
                onPress={() =>
                  gift.mutate({ instanceId: item.instanceId, toEmail: giftEmail.trim() })
                }
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>Send unused pack</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}

      {(talkLots.data?.lots.length ?? 0) > 0 ? (
        <View style={{ marginTop: 8, gap: 6 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Gift unused Talk</Text>
          {talkLots.data?.lots.map((lot) => (
            <View key={lot.id} style={[styles.pack, { borderColor: colors.border }]}>
              <Text style={{ color: colors.foreground }}>
                {lot.packId} · {lot.minutes} min unused
              </Text>
              <TextInput
                value={giftEmail}
                onChangeText={setGiftEmail}
                placeholder="Their UR email"
                autoCapitalize="none"
                maxLength={254}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              <Pressable
                onPress={() => giftTalk.mutate({ lotId: lot.id, toEmail: giftEmail.trim() })}
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>Gift this Talk pack</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {notice ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  title: { fontWeight: "800", fontSize: 15 },
  body: { fontSize: 12, lineHeight: 18 },
  pack: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 4 },
  btn: { borderRadius: 10, paddingVertical: 8, alignItems: "center", marginTop: 6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
});
