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

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <DemoSection
            title="Quick Actions"
            description="Jump into the most-used areas of the platform."
            icon="⚡"
            variant="info"
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {[
                { label: "Create Content", route: "/(tabs)/create" as const },
                { label: "Discover", route: "/(tabs)/discover" as const },
                { label: "AI Assistant", route: "/(tabs)/messages" as const },
              ].map((action) => (
                <Pressable
                  key={action.label}
                  onPress={() => router.push(action.route)}
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

          {homeTab?.subMenu?.map((item) => (
            <DemoSection
              key={item.id}
              title={item.label}
              description={`Explore ${item.label.toLowerCase()} on UR Platform.`}
              icon="📈"
            >
              <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
                Content feeds and recommendations coming soon.
              </Text>
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
