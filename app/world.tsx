import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Platform, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { PlatformSectionGate } from "@/components/platform-section-gate";
import { UrWorldPlazaViewport } from "@/components/ur-world-plaza-viewport";
import { AiTalkTimePanel } from "@/components/ai-talk-time-panel";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { trpc } from "@/lib/trpc";
import { avatarLookFromUserId } from "@/lib/ur-world-avatar";
import { formatWorldUsd } from "@/lib/ur-world-economy";
import { buildWorldSitHref, buildWorldTalkHref, type UrWorldPlazaNearby } from "@/lib/ur-world-plaza";
import {
  UR_WORLD_LEGAL_BANNER,
  UR_WORLD_SHORT_FOOTER,
  UR_WORLD_APPROVED_ADS,
} from "@/lib/ur-world-disclosures";
import {
  UR_WORLD_TALK_BULK_LINE,
  UR_WORLD_TALK_CITY_LINE,
  UR_WORLD_TALK_EMPTY_LINE,
  UR_WORLD_TALK_LOW_LINE,
} from "@/lib/ur-world-talk-upsell";
import { UR_WORLD_PLAN_STATUS } from "@/lib/ur-world-future-plan";
import { UR_WORLD_LOOK_UPGRADE_PLAN } from "@/lib/ur-world-look-upgrade-plan";
import { openWebBrowserCheckout } from "@/lib/web-checkout";
import { UrWorldLookFundPanel } from "@/components/ur-world-look-fund-panel";
import { XrHeadsetPanel } from "@/components/xr-headset-panel";

export default function UrWorldScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { isPlatformOwner } = usePlatformOwner();
  const [nearby, setNearby] = useState<UrWorldPlazaNearby | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [wishNote, setWishNote] = useState<string | null>(null);

  const snapshot = trpc.urWorld.snapshot.useQuery(undefined, { enabled: isAuthenticated });
  const talkStatus = trpc.aiTalk.getStatus.useQuery(undefined, { enabled: isAuthenticated });
  const disclosures = trpc.urWorld.disclosures.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });

  const avatar = useMemo(
    () =>
      snapshot.data?.avatar ??
      avatarLookFromUserId(String(user?.id ?? "guest"), user?.name ?? undefined, {
        isPlatformOwner,
        ownerTitle: snapshot.data?.ownerTitle,
      }),
    [snapshot.data?.avatar, snapshot.data?.ownerTitle, user?.id, user?.name, isPlatformOwner],
  );

  const minutes = talkStatus.data?.minutesRemaining ?? 0;
  const ownerTalk = isPlatformOwner || talkStatus.data?.ownerComplimentary === true || talkStatus.data?.hasTalkAccess === true;
  const low = !ownerTalk && talkStatus.data?.lowBalance === true;
  const empty = !ownerTalk && minutes <= 0;

  const onNearby = useCallback((spot: UrWorldPlazaNearby | null) => {
    setNearby(spot);
  }, []);

  const openDeskTalk = () => {
    if (nearby?.kind !== "desk") return;
    router.push(buildWorldTalkHref(nearby.desk));
  };

  const openSitTalk = () => {
    router.push(buildWorldSitHref());
  };

  const tossWish = () => {
    setWishNote("Wish noted. Entertainment only — not luck, not a prize, not money.");
  };

  const nearbyDeskName = nearby?.kind === "desk" ? nearby.name : "a specialist";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer className="bg-background">
        <PlatformSectionGate sectionId="ur_world">
          <ScrollView contentContainerStyle={{ paddingBottom: 40, gap: 12 }}>
            <TabScreenHeader
              icon="🏙️"
              title="UR World"
              subtitle="Walk the Civic Plaza — blue and purple night city, garden, benches, Glow Bar, fountain, and specialist desks."
            />

            <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 16 }}>
              <Text style={{ color: colors.primary, fontWeight: "600" }}>← Back</Text>
            </Pressable>

            {Platform.OS !== "web" ? (
              <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Open in browser</Text>
                <Text style={[styles.body, { color: colors.muted }]}>
                  The walkable city runs on the website (same as the 3D lab). Native stays for Talk and specialists.
                </Text>
                <Pressable
                  onPress={() => void openWebBrowserCheckout("/world")}
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.btnText}>Open UR World in browser</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={[styles.banner, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.body, { color: colors.muted }]}>
                {disclosures.data?.banner ?? UR_WORLD_LEGAL_BANNER}
              </Text>
            </View>

            <XrHeadsetPanel context="world" />

            {snapshot.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (
              <View style={{ paddingHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: avatar.bodyHex, borderColor: avatar.accentHex },
                  ]}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    {avatar.title ? `${avatar.title} · ${avatar.initial}` : `You · ${avatar.initial}`}
                  </Text>
                </View>
                <View style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.foreground, fontSize: 12 }}>
                    {isPlatformOwner || talkStatus.data?.ownerComplimentary
                      ? "Talk included (owner)"
                      : `Talk ${talkStatus.data?.timeRemainingDisplay ?? "0:00"} left`}
                  </Text>
                </View>
                <View style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.foreground, fontSize: 12 }}>
                    City Wallet {formatWorldUsd(snapshot.data?.balanceCents ?? 0)}
                  </Text>
                </View>
              </View>
            )}

            {isPlatformOwner ? (
              <View style={[styles.card, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {avatar.title ?? "UR Sheriff"} — your look only
                </Text>
                <Text style={[styles.body, { color: colors.muted }]}>
                  Casual civic host: oatmeal shirt, indigo jeans, clean sneakers, gold UR star. Not a cop uniform.
                  Members get hashed capsule looks. They cannot buy or copy this.
                </Text>
                <Text style={[styles.body, { color: colors.muted, marginTop: 8 }]}>
                  Change clothes in World Director AI (Owner Ops). Paste:
                </Text>
                <Text style={[styles.body, { color: colors.foreground, marginTop: 4 }]}>
                  DRESS OWNER
                </Text>
                <Text style={[styles.body, { color: colors.foreground, marginTop: 2 }]}>
                  MAKE OWNER OUTFIT weekend shirt #e7e0d4 jeans #3a4f73 shoes #f4f1ea
                </Text>
                <Text style={[styles.body, { color: colors.foreground, marginTop: 2 }]}>
                  SET OWNER TITLE UR Sheriff
                </Text>
                <Text style={[styles.body, { color: colors.muted, marginTop: 8 }]}>
                  Or tap Wear on UR Sheriff in your closet below. Playroom / 3D lab is for builds, not this plaza avatar.
                </Text>
                <Pressable
                  onPress={() => router.push("/owner-ops")}
                  style={[styles.btn, { backgroundColor: colors.primary, marginTop: 10 }]}
                >
                  <Text style={styles.btnText}>Open World Director</Text>
                </Pressable>
              </View>
            ) : null}

            {Platform.OS === "web" ? (
              <UrWorldPlazaViewport
                avatar={avatar}
                equipped={snapshot.data?.equipped}
                height={640}
                onNearby={onNearby}
              />
            ) : null}

            <View style={[styles.card, { borderColor: nearby ? colors.primary : colors.border, backgroundColor: colors.surface }]}>
              {nearby?.kind === "desk" ? (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{nearby.name}</Text>
                  <Text style={[styles.body, { color: colors.muted }]}>{nearby.hint}</Text>
                  <Text style={[styles.body, { color: colors.muted, marginTop: 6 }]}>{UR_WORLD_TALK_CITY_LINE}</Text>
                  {ownerTalk ? (
                    <Text style={[styles.body, { color: colors.muted, marginTop: 6 }]}>
                      Owner talk is included on every specialist. Push Talk — you are not billed a pack.
                    </Text>
                  ) : empty ? (
                    <Text style={[styles.body, { color: colors.foreground, marginTop: 6 }]}>{UR_WORLD_TALK_EMPTY_LINE}</Text>
                  ) : low ? (
                    <Text style={[styles.body, { color: colors.foreground, marginTop: 6 }]}>{UR_WORLD_TALK_LOW_LINE}</Text>
                  ) : (
                    <Text style={[styles.body, { color: colors.muted, marginTop: 6 }]}>{UR_WORLD_TALK_BULK_LINE}</Text>
                  )}
                  <Pressable onPress={openDeskTalk} style={[styles.btn, { backgroundColor: colors.primary, marginTop: 10 }]}>
                    <Text style={styles.btnText}>Talk at this desk</Text>
                  </Pressable>
                </>
              ) : nearby?.kind === "station" && (nearby.station.kind === "sit" || nearby.station.kind === "bar") ? (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{nearby.name}</Text>
                  <Text style={[styles.body, { color: colors.muted }]}>{nearby.hint}</Text>
                  <Text style={[styles.body, { color: colors.muted, marginTop: 6 }]}>
                    Other people walking in this same 3D plaza at the same time comes later. Sit here and talk in Social Hub now.
                  </Text>
                  <Pressable onPress={openSitTalk} style={[styles.btn, { backgroundColor: colors.primary, marginTop: 10 }]}>
                    <Text style={styles.btnText}>Sit and talk</Text>
                  </Pressable>
                </>
              ) : nearby?.kind === "station" && nearby.station.kind === "well" ? (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{nearby.name}</Text>
                  <Text style={[styles.body, { color: colors.muted }]}>{nearby.hint}</Text>
                  {wishNote ? (
                    <Text style={[styles.body, { color: colors.foreground, marginTop: 8 }]}>{wishNote}</Text>
                  ) : (
                    <Pressable onPress={tossWish} style={[styles.btn, { backgroundColor: colors.secondary, marginTop: 10 }]}>
                      <Text style={styles.btnText}>Make a quiet wish</Text>
                    </Pressable>
                  )}
                </>
              ) : nearby?.kind === "station" ? (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{nearby.name}</Text>
                  <Text style={[styles.body, { color: colors.muted }]}>{nearby.hint}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Walk the plaza</Text>
                  <Text style={[styles.body, { color: colors.muted }]}>
                    Stone walkways, café tables and chairs, sit/stand Glow Bar east, fountain in the middle, night garden
                    north, wishing well west. Three specialist desks still glow for Talk. Click the city first, then WASD.
                  </Text>
                </>
              )}
            </View>

            <UrWorldLookFundPanel />

            <UrWorldLockerPanel
              catalog={snapshot.data?.cosmeticCatalog ?? []}
              owned={snapshot.data?.cosmeticOwned ?? []}
            />

            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Talk Time in the city</Text>
              {ownerTalk ? (
                <Text style={[styles.body, { color: colors.muted, marginBottom: 8 }]}>
                  Your account is the platform owner. Talk, voice, and video are included on every AI. Members still buy packs.
                </Text>
              ) : (
                <Text style={[styles.body, { color: colors.muted, marginBottom: 8 }]}>{UR_WORLD_TALK_BULK_LINE}</Text>
              )}
              <AiTalkTimePanel creatorName={nearbyDeskName} compact showPurchase={!ownerTalk} />
            </View>

            {isPlatformOwner ? (
              <View style={[styles.card, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Approved ads only</Text>
                <Text style={[styles.body, { color: colors.muted, marginBottom: 8 }]}>
                  Stork / Business Steward must use these lines. Do not invent ROI or land claims.
                </Text>
                {(disclosures.data?.approvedAds ?? UR_WORLD_APPROVED_ADS).map((ad) => (
                  <View key={ad.id} style={{ marginBottom: 8 }}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>{ad.channel}</Text>
                    <Text style={[styles.body, { color: colors.foreground }]}>{ad.copy}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable onPress={() => setShowPlan((v) => !v)} style={{ paddingHorizontal: 16 }}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {showPlan ? "Hide" : "Show"} what we build next (Stork plan)
              </Text>
            </Pressable>
            {showPlan ? (
              <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.body, { color: colors.muted }]}>Now: {UR_WORLD_PLAN_STATUS.now}</Text>
                {isPlatformOwner ? (
                  <Text style={[styles.body, { color: colors.muted, marginTop: 6 }]}>
                    Look: Plan A is live ({UR_WORLD_LOOK_UPGRADE_PLAN.tiers.A.costUsd}). Members tip on the plaza look board
                    (not charity, not an investment). When a bar is funded and Stripe money is real, tell Business Steward
                    UPGRADE UR WORLD LOOK TO B ({UR_WORLD_LOOK_UPGRADE_PLAN.tiers.B.costUsd}), then C (
                    {UR_WORLD_LOOK_UPGRADE_PLAN.tiers.C.costUsd}). D stays parked ({UR_WORLD_LOOK_UPGRADE_PLAN.tiers.D.costUsd}).
                  </Text>
                ) : null}
                <Text style={[styles.body, { color: colors.muted, marginTop: 6 }]}>Next: {UR_WORLD_PLAN_STATUS.next}</Text>
                <Text style={[styles.body, { color: colors.muted, marginTop: 6 }]}>Later: {UR_WORLD_PLAN_STATUS.later}</Text>
                <Text style={[styles.body, { color: colors.muted, marginTop: 6 }]}>Never: {UR_WORLD_PLAN_STATUS.never}</Text>
              </View>
            ) : null}

            <Text style={{ color: colors.muted, fontSize: 11, paddingHorizontal: 16, lineHeight: 16 }}>
              {UR_WORLD_SHORT_FOOTER}
            </Text>
          </ScrollView>
        </PlatformSectionGate>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  card: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  cardTitle: { fontWeight: "800", fontSize: 15, marginBottom: 4 },
  body: { fontSize: 12, lineHeight: 18 },
  btn: { borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
