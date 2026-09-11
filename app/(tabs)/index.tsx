import { ScrollView, View, Text } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { HomeLaunchPromoBanner } from "@/components/home-launch-promo-banner";
import { DailyLoyaltyBanner } from "@/components/daily-loyalty-banner";
import { DemoSection } from "@/components/demo-section";
import { useDailySignIn } from "@/hooks/use-daily-signin";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";
import { Link, useRouter } from "expo-router";
import { DailyHubPanel } from "@/components/daily-hub-panel";
import { SocialFeedPreview } from "@/components/social-feed-preview";
import { AiFreeBoardPanel } from "@/components/ai-free-board-panel";
import { PlatformSearchPanel } from "@/components/platform-search-panel";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { AppPressable } from "@/components/app-pressable";
import { ADMIN_TAB_HREF } from "@/lib/admin-dashboard-routes";
import { GoToIdPhotosButton } from "@/components/go-to-id-photos";

export default function HomeScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const dailySignIn = useDailySignIn();
  const homeTab = consolidatedNavigation.getTab("home");
  const { canAccessAdminDashboard, isPlatformOwner } = usePlatformOwner();

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <HomeLaunchPromoBanner />

        <View style={{ paddingHorizontal: 16, marginTop: 12, gap: 8 }}>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
            ID check — tap to photograph ID front, ID back, and a selfie
          </Text>
          <GoToIdPhotosButton label="Open ID photo page" />
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <AppPressable
            onPress={() => router.push("/e-manual")}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1.5,
              borderColor: colors.primary,
              gap: 4,
            }}
          >
            <Text pointerEvents="none" style={{ fontSize: 16, fontWeight: "800", color: colors.foreground }}>
              📘 Your free join e-manual
            </Text>
            <Text pointerEvents="none" style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
              Every member gets this. Print it, write your own with Author Muse, and sell it from your shop.
            </Text>
          </AppPressable>
        </View>

        {canAccessAdminDashboard ? (
          <Link href={ADMIN_TAB_HREF} asChild>
            <AppPressable
              style={{
                marginHorizontal: 16,
                marginTop: 12,
                backgroundColor: `${colors.primary}14`,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: colors.primary,
                padding: 16,
                gap: 6,
              }}
            >
              <Text
                pointerEvents="none"
                style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}
              >
                🏛️ Administration Dashboard
              </Text>
              <Text
                pointerEvents="none"
                style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}
              >
                {isPlatformOwner
                  ? "Business Steward, staff, social posting, and running the site. Also in the Admin tab below."
                  : "Open your staff admin tools. Also in the Admin tab below."}
              </Text>
            </AppPressable>
          </Link>
        ) : null}

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

        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <AppPressable
            onPress={() => router.push("/world")}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              borderWidth: 1.5,
              borderColor: colors.primary,
            }}
          >
            <Text pointerEvents="none" style={{ fontSize: 28 }}>
              🏙️
            </Text>
            <View pointerEvents="none" style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: colors.foreground }}>
                UR World — Civic Plaza
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
                Walk your avatar through the night plaza, sit, talk at a desk, and open the locker. Entertainment city — not land.
              </Text>
            </View>
          </AppPressable>
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <AppPressable
            onPress={() => router.push("/music-studio")}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              borderWidth: 1.5,
              borderColor: colors.primary,
              marginBottom: 12,
            }}
          >
            <Text pointerEvents="none" style={{ fontSize: 28 }}>
              🎚️
            </Text>
            <View pointerEvents="none" style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: colors.foreground }}>
                Music Studio
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
                Two decks, a classroom, and Musician + Songwriter. Learn the booth, then make a beat.
              </Text>
            </View>
          </AppPressable>
          <AppPressable
            onPress={() => router.push("/cartoon-studio")}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              borderWidth: 1.5,
              borderColor: colors.primary,
            }}
          >
            <Text pointerEvents="none" style={{ fontSize: 28 }}>
              🎬
            </Text>
            <View pointerEvents="none" style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: colors.foreground }}>
                Cartoon Studio
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
                Pay first. Draft, Lite, Mid, Cinema, or Premiere 4K. Tax and card fee on top. No refunds.
              </Text>
            </View>
          </AppPressable>
        </View>

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
                ...(canAccessAdminDashboard
                  ? [
                      {
                        label: "Administration Dashboard",
                        onPress: () => router.push("/(tabs)/admin"),
                      },
                    ]
                  : []),
                {
                  label: "All AI Specialists",
                  onPress: () => router.push("/ais"),
                },
                {
                  label: "UR World",
                  onPress: () => router.push("/world"),
                },
                {
                  label: "Cartoon Studio",
                  onPress: () => router.push("/cartoon-studio"),
                },
                {
                  label: "Music Studio",
                  onPress: () => router.push("/music-studio"),
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
                  label: "Join e-manual",
                  onPress: () => router.push("/e-manual"),
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
                  label: "Legal Masters",
                  onPress: () =>
                    router.push({
                      pathname: "/ais",
                      params: { group: "legalMasters", ai: "ai-attorney-criminal-001" },
                    }),
                },
                {
                  label: "Credit Attorney AI",
                  onPress: () =>
                    router.push({
                      pathname: "/ais",
                      params: { group: "legalMasters", ai: "ai-attorney-credit-001" },
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
                  label: "Master CNC & Mill AI",
                  onPress: () =>
                    router.push({
                      pathname: "/(tabs)/ais",
                      params: { ai: "ai-cnc-master-001" },
                    }),
                },
                {
                  label: "Culinary Arts AI",
                  onPress: () =>
                    router.push({
                      pathname: "/(tabs)/ais",
                      params: { ai: "ai-culinary-001" },
                    }),
                },
                {
                  label: "AI Playroom",
                  onPress: () => router.push("/playroom"),
                },
                {
                  label: "UR 3D Workspace",
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
                  label: "Jobsite & Office",
                  onPress: () => router.push("/jobsite"),
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
                <AppPressable
                  key={action.label}
                  onPress={action.onPress}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    minHeight: 40,
                    justifyContent: "center",
                  }}
                >
                  <Text
                    pointerEvents="none"
                    style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}
                  >
                    {action.label}
                  </Text>
                </AppPressable>
              ))}
            </View>
          </DemoSection>

          <DemoSection
            title="Search UR"
            description="Find specialists, creators, videos, posts, and shop items inside this platform. Not the internet."
            icon="🔍"
            variant="info"
          >
            <PlatformSearchPanel compact />
          </DemoSection>

          <DemoSection
            title="UR AI Free Board"
            description="Specialists post free text and video lessons so the site is never empty — even before human creators join."
            icon="🤖"
            variant="info"
          >
            <AiFreeBoardPanel compact />
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
                <AppPressable onPress={() => router.push(target as never)}>
                  <Text
                    pointerEvents="none"
                    style={{ color: colors.primary, fontSize: 14, marginTop: 4, fontWeight: "600" }}
                  >
                    Open {item.label} →
                  </Text>
                </AppPressable>
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
