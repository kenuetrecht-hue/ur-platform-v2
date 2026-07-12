import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, FlatList, Pressable, RefreshControl, Modal, Platform , Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { Avatar, TierBadge, VerifiedBadge, Card, SectionHeader, URMark } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { Creator, getCreators, getUser, User, TIERS, pointsToNextTier, tipFounder, pickPartnerForSlot, recordPartnerClick, Partner } from "@/lib/store";
import { ALL_AI_CREATORS } from "@/lib/ai-creators-system";

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const featured = creators.filter((c) => c.verified).slice(0, 5);
  const trending = [...creators].sort((a, b) => b.members - a.members).slice(0, 4);
  const newCreators = [...creators].sort((a, b) => b.joinedDate.localeCompare(a.joinedDate)).slice(0, 4);
  const aiCreators = ALL_AI_CREATORS.slice(0, 3);

  const tierProgress = user ? pointsToNextTier(user.points) : null;

  return (
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
          <Pressable onPress={() => router.push("/loyalty")} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border }}>
              <IconSymbol name="sparkles" size={14} color={colors.primary} />
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>{user?.points || 0} pts</Text>
            </View>
          </Pressable>
        </View>

        {/* Launch Spotlight Banner — Kenneth's 3 pillars */}
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

        {/* Loyalty banner */}
        {user && tierProgress && (
          <Pressable onPress={() => router.push("/loyalty")} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginHorizontal: 20, marginBottom: 20 })}>
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, padding: 16 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <View>
                  <Text style={{ color: "#FFFFFF", fontSize: 13, opacity: 0.9 }}>Your tier</Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "700" }}>{user.tier}</Text>
                </View>
                <IconSymbol name="crown.fill" size={32} color={TIERS[user.tier].color} />
              </View>
              {tierProgress.next && (
                <View style={{ gap: 6 }}>
                  <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 3, overflow: "hidden" }}>
                    <View style={{ width: `${tierProgress.progress * 100}%`, height: "100%", backgroundColor: "#FFFFFF" }} />
                  </View>
                  <Text style={{ color: "#FFFFFF", fontSize: 12, opacity: 0.9 }}>
                    {tierProgress.needed} points to {tierProgress.next}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>
        )}

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

            <View style={{ height: 1, backgroundColor: colors.border, marginTop: 4 }} />

            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600", letterSpacing: 0.3 }}>
                SUPPORT THE FOUNDER
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[1, 5, 10].map((amount) => (
                  <Pressable
                    key={amount}
                    onPress={() => sendFounderTip(amount)}
                    style={({ pressed }) => ({
                      flex: 1,
                      transform: pressed ? [{ scale: 0.97 }] : undefined,
                    })}
                  >
                    <LinearGradient
                      colors={["#4F46E5", "#7C3AED"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 12,
                        paddingVertical: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>${amount}</Text>
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>
              <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 2 }}>
                Tips come straight out of your wallet.
              </Text>
            </View>
          </Card>
        </View>

        {founderPartner && (
          <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
            <Pressable
              onPress={async () => {
                await recordPartnerClick(founderPartner.id);
                Linking.openURL(founderPartner.url).catch(() => {});
              }}
              style={({ pressed }) => ({
                borderRadius: 14,
                padding: 14,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" }}>
                <IconSymbol name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 }}>KEN RECOMMENDS</Text>
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700", marginTop: 2 }}>{founderPartner.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{founderPartner.tagline}</Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </Pressable>
          </View>
        )}

        <Modal
          visible={tipModal !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setTipModal(null)}
        >
          <Pressable
            onPress={() => setTipModal(null)}
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.55)",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 360,
                backgroundColor: colors.background,
                borderRadius: 20,
                padding: 24,
                gap: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {tipModal?.kind === "thanks" && (
                <>
                  <View
                    style={{
                      alignSelf: "center",
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: colors.primary + "20",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol name="heart.fill" size={28} color={colors.primary} />
                  </View>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 22,
                      fontWeight: "800",
                      textAlign: "center",
                      letterSpacing: -0.4,
                      lineHeight: 28,
                    }}
                  >
                    This is how movements start.
                  </Text>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 18,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    Thank you.
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 13,
                      textAlign: "center",
                      lineHeight: 19,
                    }}
                  >
                    Your ${tipModal.amount} tip went straight to Ken. Every dollar fuels UR.
                  </Text>
                  <Pressable
                    onPress={() => setTipModal(null)}
                    style={({ pressed }) => ({
                      marginTop: 6,
                      backgroundColor: colors.primary,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>You&apos;re welcome</Text>
                  </Pressable>
                </>
              )}

              {tipModal?.kind === "insufficient" && (
                <>
                  <View
                    style={{
                      alignSelf: "center",
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: colors.warning + "20",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol name="dollarsign.circle.fill" size={28} color={colors.warning} />
                  </View>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 18,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    Not enough in your wallet
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 13,
                      textAlign: "center",
                      lineHeight: 19,
                    }}
                  >
                    You need ${tipModal.amount} to send this tip. Top up your wallet and try again.
                  </Text>
                  <Pressable
                    onPress={() => {
                      setTipModal(null);
                      router.push("/(tabs)/wallet");
                    }}
                    style={({ pressed }) => ({
                      marginTop: 6,
                      backgroundColor: colors.primary,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>Top up wallet</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setTipModal(null)}
                    style={({ pressed }) => ({ alignItems: "center", paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>Maybe later</Text>
                  </Pressable>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* New Creators */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionHeader title="New on UR" />
          <View style={{ gap: 10 }}>
            {newCreators.map((creator) => (
              <CreatorRowCard key={creator.id} creator={creator} />
            ))}
          </View>
        </View>

        {/* Become a Creator CTA */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Card style={{ alignItems: "center", padding: 24, gap: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center" }}>
              <IconSymbol name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>Become a Creator</Text>
            <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              Keep 85% of every transaction. Build your community on UR.
            </Text>
            <Pressable onPress={() => router.push("/creator-dashboard")} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>Get Started →</Text>
            </Pressable>
          </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function PillarRow({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.2)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconSymbol name={icon as any} size={18} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>{title}</Text>
        <Text style={{ color: "#FFFFFF", fontSize: 12, opacity: 0.88, marginTop: 1 }}>{subtitle}</Text>
      </View>
    </View>
  );
}

function CreatorRowCard({ creator }: { creator: Creator }) {
  const colors = useColors();
  return (
    <Pressable onPress={() => router.push(`/creator/${creator.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
        <Avatar uri={creator.photo} size={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600", flex: 1 }} numberOfLines={1}>{creator.name}</Text>
            {creator.verified && <VerifiedBadge size={12} />}
          </View>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 1 }} numberOfLines={1}>
            {creator.category} · {creator.members.toLocaleString()} members
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          {creator.minutePrice !== undefined && <Text style={{ color: colors.muted, fontSize: 10 }}>${creator.minutePrice.toFixed(2)}/min</Text>}
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>${creator.monthlyPrice.toFixed(2)}</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>/month</Text>
        </View>
      </View>
    </Pressable>
  );
}
