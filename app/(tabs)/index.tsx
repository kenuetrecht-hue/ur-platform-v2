import { ScrollView, View, Text, Pressable } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { WarningBanner } from "@/components/warning-banner";
import { LaunchPromotionBanner } from "@/components/launch-promotion-banner";
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
        <WarningBanner variant="compact" />
        <LaunchPromotionBanner />

        <DailyLoyaltyBanner
          totalPoints={dailySignIn.totalPoints}
          pointsEarnedToday={
            dailySignIn.alreadyEarnedToday ? 0 : dailySignIn.pointsAwarded
          }
          totalSignIns={dailySignIn.totalSignIns}
          hasNewTicket={!!dailySignIn.ticketId}
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
                  label: "Create Content",
                  onPress: () => router.push("/(tabs)/create"),
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

          {homeTab?.subMenu?.map((item) => (
            <DemoSection
              key={item.id}
              title={item.label}
              description={`Explore ${item.label.toLowerCase()} on UR Platform.`}
              icon="📈"
            >
              <Pressable onPress={() => router.push("/(tabs)/messages")}>
                <Text style={{ color: colors.primary, fontSize: 14, marginTop: 4, fontWeight: "600" }}>
                  View in Social Feed →
                </Text>
              </Pressable>
            </DemoSection>
          ))}

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
