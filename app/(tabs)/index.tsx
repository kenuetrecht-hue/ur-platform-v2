import { ScrollView, View, Text, Pressable } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { HomeLaunchPromoBanner } from "@/components/home-launch-promo-banner";
import { DailyLoyaltyBanner } from "@/components/daily-loyalty-banner";
import { DemoSection } from "@/components/demo-section";
import { useDailySignIn } from "@/hooks/use-daily-signin";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";
import { useRouter } from "expo-router";
import { DailyHubPanel } from "@/components/daily-hub-panel";
import { SocialFeedPreview } from "@/components/social-feed-preview";

export default function HomeScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const dailySignIn = useDailySignIn();
  const homeTab = consolidatedNavigation.getTab("home");

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <HomeLaunchPromoBanner />

        <DailyLoyaltyBanner
          totalPoints={dailySignIn.totalPoints}
          pointsEarnedToday={
            dailySignIn.alreadyClaimedToday
              ? 0
              : dailySignIn.pointsAwardedToday + dailySignIn.welcomeBonusAwarded
          }
          totalSignIns={dailySignIn.totalSignIns}
          currentStreakDays={dailySignIn.currentStreakDays}
          milestoneUnlocked={dailySignIn.milestoneUnlocked}
          nextMilestone={dailySignIn.nextMilestone}
          alreadyClaimedToday={dailySignIn.alreadyClaimedToday}
        />

        <TabScreenHeader
          icon="🏠"
          title={`Welcome${user?.name ? `, ${user.name}` : ""}`}
          subtitle="Your creator hub — trending content, daily rewards, and quick actions."
        />

        <DailyHubPanel />

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <DemoSection
            title="Quick Actions"
            description="Jump into the most-used areas of the platform."
            icon="⚡"
            variant="info"
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {[
                {
                  label: "All AI Specialists",
                  onPress: () => router.push("/ais"),
                },
                {
                  label: "ContentMate",
                  onPress: () =>
                    router.push({
                      pathname: "/ais",
                      params: { group: "platform", ai: "contentmate" },
                    }),
                },
                {
                  label: "TechBuilder · Apps",
                  onPress: () =>
                    router.push({
                      pathname: "/ais",
                      params: { group: "platform", ai: "ai-coder-001", surface: "build" },
                    }),
                },
                {
                  label: "Author Muse · Books",
                  onPress: () =>
                    router.push({
                      pathname: "/ais",
                      params: { group: "creative", ai: "ai-author-001" },
                    }),
                },
                {
                  label: "Songwriter AI",
                  onPress: () =>
                    router.push({
                      pathname: "/ais",
                      params: { group: "creative", ai: "ai-songwriter-001" },
                    }),
                },
                {
                  label: "Musician AI",
                  onPress: () =>
                    router.push({
                      pathname: "/ais",
                      params: { group: "creative", ai: "ai-musician-001" },
                    }),
                },
                {
                  label: "Poet AI",
                  onPress: () =>
                    router.push({
                      pathname: "/ais",
                      params: { group: "creative", ai: "ai-poet-001" },
                    }),
                },
                {
                  label: "Logo & Brand AI",
                  onPress: () =>
                    router.push({
                      pathname: "/ais",
                      params: { group: "creative", ai: "ai-logo-brand-001" },
                    }),
                },
                {
                  label: "GameForge · Games",
                  onPress: () =>
                    router.push({
                      pathname: "/ais",
                      params: { group: "tech", ai: "ai-game-dev-001", surface: "build" },
                    }),
                },
                {
                  label: "Merch 3D Lab",
                  onPress: () =>
                    router.push({
                      pathname: "/3d-workspace",
                      params: { project: "merchandise" },
                    }),
                },
                {
                  label: "Create Content",
                  onPress: () => router.push("/(tabs)/create"),
                },
                {
                  label: "Blueprint Reader AI",
                  onPress: () =>
                    router.push({
                      pathname: "/(tabs)/ais",
                      params: { ai: "ai-blueprint-reader-001" },
                    }),
                },
                {
                  label: "AI Playroom",
                  onPress: () => router.push("/playroom"),
                },
                {
                  label: "3D Workspace",
                  onPress: () => router.push("/3d-workspace"),
                },
                {
                  label: "Creator Dashboard",
                  onPress: () => router.push("/creator-dashboard"),
                },
                {
                  label: "UR Shop",
                  onPress: () => router.push("/shop"),
                },
                {
                  label: "Social Feed",
                  onPress: () => router.push("/(tabs)/messages"),
                },
                {
                  label: "Affiliate Dashboard",
                  onPress: () => router.push("/affiliate-dashboard"),
                },
                {
                  label: "Discover",
                  onPress: () => router.push("/(tabs)/discover"),
                },
              ].map((action) => (
                <Pressable
                  key={action.label}
                  onPress={action.onPress}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </DemoSection>

          <DemoSection
            title="Social Feed"
            description="Public posts, likes, comments, and trending hashtags — free for everyone."
            icon="📱"
            variant="info"
          >
            <SocialFeedPreview />
          </DemoSection>

          {homeTab?.subMenu?.map((item) => {
            const routeById: Record<string, string> = {
              trending: "/(tabs)/discover",
              following: "/(tabs)/messages",
              recommended: "/(tabs)/discover",
              categories: "/shop",
            };
            const target = routeById[item.id] ?? "/(tabs)/discover";
            return (
              <DemoSection
                key={item.id}
                title={item.label}
                description={`Explore ${item.label.toLowerCase()} on UR Platform.`}
                icon="📈"
              >
                <Pressable onPress={() => router.push(target as never)}>
                  <Text style={{ color: colors.primary, fontSize: 14, marginTop: 4, fontWeight: "600" }}>
                    Open {item.label} →
                  </Text>
                </Pressable>
              </DemoSection>
            );
          })}

          {dailySignIn.error ? (
            <DemoSection
              title="Loyalty Status"
              description={dailySignIn.error}
              icon="🎁"
              variant="warning"
            />
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
