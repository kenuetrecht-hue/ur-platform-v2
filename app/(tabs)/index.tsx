import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, FlatList, Pressable, RefreshControl, Modal, Platform , Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { Avatar, TierBadge, VerifiedBadge, Card, SectionHeader, URMark } from "@/components/ur-ui";
import { PromotionalBanner } from "@/components/promotional-banner";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { Creator, getCreators, getUser, User, TIERS, pointsToNextTier, tipFounder, pickPartnerForSlot, recordPartnerClick, Partner } from "@/lib/store";
import { ALL_AI_CREATORS } from "@/lib/ai-creators-system";
import { useDailySignIn, useScratchOffTicket } from "@/hooks/use-daily-signin";

export default function HomeScreen() {
  const colors = useColors();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [founderPartner, setFounderPartner] = useState<Partner | null>(null);
  const [tipModal, setTipModal] = useState<
    | { kind: "thanks"; amount: number }
    | { kind: "insufficient"; amount: number }
    | null
  >(null);
  const dailySignIn = useDailySignIn();
  const { showModal, setShowModal, revealTicket, claimTicket } = dailySignIn;
  const { ticketState } = useScratchOffTicket(dailySignIn.ticketId);

  const sendFounderTip = useCallback(async (amount: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    const result = await tipFounder(amount);
    if (result.ok) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      const fresh = await getUser();
      setUser(fresh);
      setTipModal({ kind: "thanks", amount });
    } else {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
      setTipModal({ kind: "insufficient", amount });
    }
  }, []);

  const load = useCallback(async () => {
    const [c, u, fp] = await Promise.all([
      getCreators(),
      getUser(),
      pickPartnerForSlot("founder_card"),
    ]);
    setCreators(c);
    setUser(u);
    setFounderPartner(fp);
  }, []);

  useFocusEffect(useCallback(() => { 
    load();
    // Trigger daily sign-in modal on home screen focus
    setShowModal(true);
  }, [load, setShowModal]));

  const featured = creators.filter((c) => c.verified).slice(0, 5);
  const trending = [...creators].sort((a, b) => b.members - a.members).slice(0, 4);
  const newCreators = [...creators].sort((a, b) => b.joinedDate.localeCompare(a.joinedDate)).slice(0, 4);
  const aiCreators = ALL_AI_CREATORS.slice(0, 3);

  const tierProgress = user ? pointsToNextTier(user.points) : null;

  return (
    <>
      {/* Daily Sign-In Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: colors.background, borderRadius: 20, padding: 24, maxWidth: 320, gap: 16 }}>
            {ticketState.status === "unrevealed" && (
              <>
                <View style={{ alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 48 }}>🎉</Text>
                  <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700" }}>Daily Sign-In Bonus!</Text>
                  <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>You earned 200 loyalty points!</Text>
                </View>
                <View style={{ backgroundColor: colors.primary + "20", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}>
                  <Text style={{ color: colors.primary, fontSize: 24, fontWeight: "700" }}>+200 pts</Text>
                </View>
                <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>Tap below to reveal your scratch-off ticket for a chance to win more rewards!</Text>
                <Pressable onPress={revealTicket} style={({ pressed }) => ({ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, opacity: pressed ? 0.8 : 1, alignItems: "center" })}>
                  <Text style={{ color: "white", fontWeight: "700" }}>Reveal Ticket</Text>
                </Pressable>
                <Pressable onPress={() => setShowModal(false)} style={({ pressed }) => ({ paddingVertical: 10, opacity: pressed ? 0.6 : 1, alignItems: "center" })}>
                  <Text style={{ color: colors.muted, fontWeight: "600" }}>Skip for now</Text>
                </Pressable>
              </>
            )}
            {ticketState.status === "revealed" && (
              <>
                <View style={{ alignItems: "center", gap: 12 }}>
                  <Text style={{ fontSize: 64 }}>🎟️</Text>
                  <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>You Won!</Text>
                  <View style={{ backgroundColor: colors.success + "20", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}>
                    <Text style={{ color: colors.success, fontSize: 16, fontWeight: "700" }}>
                      {ticketState.prizeType === "loyalty_points" ? `+${ticketState.prizeValue} Points` : `+${ticketState.prizeValue} Drawing Entries`}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={claimTicket} style={({ pressed }) => ({ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, opacity: pressed ? 0.8 : 1, alignItems: "center" })}>
                  <Text style={{ color: "white", fontWeight: "700" }}>Claim Prize</Text>
                </Pressable>
              </>
            )}
            {ticketState.status === "claimed" && (
              <>
                <View style={{ alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 48 }}>✨</Text>
                  <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>Prize Claimed!</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>Check your loyalty page to see your updated rewards.</Text>
                </View>
                <Pressable onPress={() => { setShowModal(false); router.push("/loyalty-marketplace"); }} style={({ pressed }) => ({ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, opacity: pressed ? 0.8 : 1, alignItems: "center" })}>
                  <Text style={{ color: "white", fontWeight: "700" }}>View Loyalty</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ScreenContainer>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <URMark size={36} />
              <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }}>UR</Text>
            </View>
            <Pressable onPress={() => router.push("/loyalty-marketplace")} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border }}>
                <IconSymbol name="sparkles" size={14} color={colors.primary} />
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>{user?.points || 0} pts</Text>
              </View>
            </Pressable>
          </View>

          {/* Launch Spotlight Banner */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <LinearGradient
              colors={["#4F46E5", "#7C3AED", "#A855F7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 20, padding: 20, gap: 14 }}
            >
              <View style={{ gap: 4 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", letterSpacing: -0.4 }}>
                  Welcome to UR
                </Text>
                <Text style={{ color: "#FFFFFF", fontSize: 13, opacity: 0.92, lineHeight: 18 }}>
                  A creator platform built on what matters most.
                </Text>
              </View>

              <View style={{ gap: 10, marginTop: 4 }}>
                <PillarRow
                  icon="heart.fill"
                  title="Our Core Values"
                  subtitle="Clean, honest, community-based."
                />
                <PillarRow
                  icon="dollarsign.circle.fill"
                  title="Creators Keep 85%"
                  subtitle="The best split in the industry."
                />
                <PillarRow
                  icon="slider.horizontal.3"
                  title="Set Your Own Price"
                  subtitle="Per minute, hour, or month — your call."
                />
              </View>
            </LinearGradient>
          </View>

          {/* 30-Day Promotional Banner */}
          <View style={{ marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: "hidden" }}>
            <PromotionalBanner creatorCounts={{ tier1: 0, tier2: 0, tier3: 0 }} />
          </View>

          {/* Our Mission */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Card style={{ gap: 10, padding: 18, backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }}>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Our Mission</Text>
              <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>
                UR a space for all creators. Whether you share art, life, or your mental health journey, UR welcome here.
              </Text>
            </Card>
          </View>

          {/* Featured Creators */}
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader title="Featured Creators" action="See all" onActionPress={() => router.push("/(tabs)/discover")} />
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={featured}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/creator/${item.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                <View style={{ width: 200, backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar uri={item.photo} size={48} ring />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", flex: 1 }} numberOfLines={1}>{item.name}</Text>
                        {item.verified && <VerifiedBadge size={12} />}
                      </View>
                      <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{item.username}</Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }} numberOfLines={2}>{item.bio}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <TierBadge tier={item.tier} />
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      {item.minutePrice !== undefined && <Text style={{ color: colors.muted, fontSize: 11 }}>${item.minutePrice.toFixed(2)}/min</Text>}
                      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>${item.monthlyPrice.toFixed(2)}/mo</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            )}
          />

          {/* AI Creators Spotlight */}
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionHeader title="AI Creators This Week" action="See all" onActionPress={() => router.push("/ai-creators-directory")} />
            <View style={{ gap: 10 }}>
              {aiCreators.map((aiCreator) => (
                <Pressable
                  key={aiCreator.id}
                  onPress={() => router.push(`/ai-creator-profile?id=${aiCreator.id}`)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ fontSize: 32 }}>{aiCreator.avatar}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>{aiCreator.name}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{aiCreator.category}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <View style={{ backgroundColor: colors.primary + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "600" }}>${aiCreator.price}/mo</Text>
                        </View>
                        <Text style={{ color: colors.muted, fontSize: 11 }}>{(aiCreator.followers / 1000).toFixed(0)}K followers</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>{aiCreator.rating}⭐</Text>
                      <Text style={{ color: colors.muted, fontSize: 11 }}>AI</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Trending */}
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionHeader title="Trending This Week" />
            <View style={{ gap: 10 }}>
              {trending.map((creator) => (
                <CreatorRowCard key={creator.id} creator={creator} />
              ))}
            </View>
          </View>

          {/* Real Merchant Services Affiliate Banner */}
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Pressable onPress={() => router.push("/real-merchant")} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name="creditcard.fill" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>Real Merchant Services</Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 13, opacity: 0.9, marginTop: 2 }}>Better payment processing for creators →</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Founder's Note */}
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Card style={{ padding: 18, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar uri="https://files.manuscdn.com/user_upload_by_module/session_file/310519663606080544/OOPiWWXfrMzrVXzQ.png" size={44} ring />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>
                      Ken Uetrecht
                    </Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.primary + "15", borderWidth: 1, borderColor: colors.primary + "40" }}>
                      <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700", letterSpacing: 0.3 }}>FOUNDER</Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>From nothing, for everyone</Text>
                </View>
              </View>
              <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 21 }}>
                I came from nothing and wanted to be better in life. I live with severe anxiety and bipolar disorder, and I know the limitations they bring — but I also know that with hard work and determination, you can overcome them.
                {"\n\n"}
                That&apos;s why I created UR. I&apos;m here asking for your help to build it into one of the biggest apps out there.
              </Text>
            </Card>
          </View>

          {/* Footer */}
          <View style={{ paddingHorizontal: 20, marginTop: 24, paddingBottom: 12, gap: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>
              © 2026 UR LLC. All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

// Helper components
function PillarRow({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <IconSymbol name={icon as any} size={20} color="#FFFFFF" />
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>{title}</Text>
        <Text style={{ color: "#FFFFFF", fontSize: 11, opacity: 0.8 }}>{subtitle}</Text>
      </View>
    </View>
  );
}

function CreatorRowCard({ creator }: { creator: Creator }) {
  const colors = useColors();
  return (
    <Pressable onPress={() => router.push(`/creator/${creator.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar uri={creator.photo} size={48} ring />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", flex: 1 }} numberOfLines={1}>{creator.name}</Text>
            {creator.verified && <VerifiedBadge size={12} />}
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{creator.bio}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>${creator.monthlyPrice.toFixed(2)}</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>per month</Text>
        </View>
      </View>
    </Pressable>
  );
}
