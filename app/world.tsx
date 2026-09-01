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
import { buildWorldTalkHref, type UrWorldTalkDesk } from "@/lib/ur-world-plaza";
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
import { openWebBrowserCheckout } from "@/lib/web-checkout";
import { UrWorldLockerPanel } from "@/components/ur-world-locker-panel";

export default function UrWorldScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { isPlatformOwner } = usePlatformOwner();
  const [nearbyDesk, setNearbyDesk] = useState<UrWorldTalkDesk | null>(null);
  const [showPlan, setShowPlan] = useState(false);

  const snapshot = trpc.urWorld.snapshot.useQuery(undefined, { enabled: isAuthenticated });
  const talkStatus = trpc.aiTalk.getStatus.useQuery(undefined, { enabled: isAuthenticated });
  const disclosures = trpc.urWorld.disclosures.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });

  const avatar = useMemo(
    () => snapshot.data?.avatar ?? avatarLookFromUserId(String(user?.id ?? "guest"), user?.name ?? undefined),
    [snapshot.data?.avatar, user?.id, user?.name],
  );

  const minutes = talkStatus.data?.minutesRemaining ?? 0;
  const low = talkStatus.data?.lowBalance === true;
  const empty = minutes <= 0;

  const onNearbyDesk = useCallback((desk: UrWorldTalkDesk | null) => {
    setNearbyDesk(desk);
  }, []);

  const openDeskTalk = () => {
    if (!nearbyDesk) return;
    router.push(buildWorldTalkHref(nearbyDesk));
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer className="bg-background">
        <PlatformSectionGate sectionId="ur_world">
          <ScrollView contentContainerStyle={{ paddingBottom: 40, gap: 12 }}>
            <TabScreenHeader
              icon="🏙️"
              title="UR World"
              subtitle="Walk the Civic Plaza. Your avatar is already here. Talk at a desk with the same Talk Time packs."
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
                  <Text style={{ color: "#fff", fontWeight: "800" }}>You · {avatar.initial}</Text>
                </View>
                <View style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.foreground, fontSize: 12 }}>
                    Talk {talkStatus.data?.timeRemainingDisplay ?? "0:00"} left
                  </Text>
                </View>
                <View style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.foreground, fontSize: 12 }}>
                    City Wallet {formatWorldUsd(snapshot.data?.balanceCents ?? 0)}
                  </Text>
                </View>
              </View>
            )}

            {Platform.OS === "web" ? (
              <UrWorldPlazaViewport
                avatar={avatar}
                equipped={snapshot.data?.equipped}
                height={520}
                onNearbyDesk={onNearbyDesk}
              />
            ) : null}

            <View style={[styles.card, { borderColor: nearbyDesk ? colors.primary : colors.border, backgroundColor: colors.surface }]}>
              {nearbyDesk ? (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{nearbyDesk.name}</Text>
                  <Text style={[styles.body, { color: colors.muted }]}>{nearbyDesk.hint}</Text>
                  <Text style={[styles.body, { color: colors.muted, marginTop: 6 }]}>{UR_WORLD_TALK_CITY_LINE}</Text>
                  {empty ? (
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
              ) : (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Walk to a glowing desk</Text>
                  <Text style={[styles.body, { color: colors.muted }]}>
                    Trade Yard (electrician), The Line (kitchen), Language Walk (LinguaMate). Click the city first, then
                    WASD.
                  </Text>
                </>
              )}
            </View>

            <UrWorldLockerPanel
              catalog={snapshot.data?.cosmeticCatalog ?? []}
              owned={snapshot.data?.cosmeticOwned ?? []}
            />

            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Talk Time in the city</Text>
              <Text style={[styles.body, { color: colors.muted, marginBottom: 8 }]}>{UR_WORLD_TALK_BULK_LINE}</Text>
              <AiTalkTimePanel creatorName={nearbyDesk?.name ?? "a specialist"} compact showPurchase />
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
