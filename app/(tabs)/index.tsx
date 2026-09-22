import { useState } from "react";
import { View, Text } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { HomeLaunchPromoBanner } from "@/components/home-launch-promo-banner";
import { DailyLoyaltyBanner } from "@/components/daily-loyalty-banner";
import { useDailySignIn } from "@/hooks/use-daily-signin";
import { useRouter } from "expo-router";
import { DailyHubPanel } from "@/components/daily-hub-panel";
import { SocialFeedPreview } from "@/components/social-feed-preview";
import { AiFreeBoardPanel } from "@/components/ai-free-board-panel";
import { PlatformSearchPanel } from "@/components/platform-search-panel";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { AppPressable } from "@/components/app-pressable";
import { ADMIN_TAB_HREF } from "@/lib/admin-dashboard-routes";
import { GoToIdPhotosButton } from "@/components/go-to-id-photos";
import { PasswordRemindBanner } from "@/components/password-remind-banner";
import { trpc } from "@/lib/trpc";
import { HubTabBar } from "@/components/hub-tab-bar";
import { HubDoorGrid, HubDoorTile } from "@/components/hub-door-tile";
import { TabPageScroll } from "@/components/tab-page-scroll";
import {
  HOME_DOWNLOAD_DOORS,
  HOME_HUB_TAB_ROWS,
  HOME_MAIN_DOORS,
  HOME_STUDIO_DOORS,
  isHomeHubTabId,
  type HomeHubTabId,
} from "@/lib/home-hub";
import { useAppInstallActions } from "@/hooks/use-app-install-actions";
import { withAlpha } from "@/lib/brand-theme";

export default function HomeScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const dailySignIn = useDailySignIn();
  const { isPlatformOwner } = usePlatformOwner();
  const { install } = useAppInstallActions();
  const kyc = trpc.ageKyc.getStatus.useQuery(undefined, { retry: 0, staleTime: 45_000 });
  const needsIdPhotos = kyc.data?.verified !== true;
  const [hubTab, setHubTab] = useState<HomeHubTabId>("start");

  return (
    <ScreenContainer className="bg-background">
      <TabScreenHeader
        compact
        showBack={false}
        icon="🏠"
        title={user?.name ? user.name : "Home"}
      />
      {HOME_HUB_TAB_ROWS.map((row, index) => (
        <HubTabBar
          key={`home-row-${index}`}
          tabs={row}
          activeId={hubTab}
          onSelect={(id) => {
            if (isHomeHubTabId(id)) setHubTab(id);
          }}
        />
      ))}
      <TabPageScroll>
        {hubTab === "start" ? (
          <>
            <HomeLaunchPromoBanner />
            <PasswordRemindBanner />
            {needsIdPhotos ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.gold, fontWeight: "800", fontSize: 15 }}>
                  Finish the three pictures
                </Text>
                <GoToIdPhotosButton label="Open the picture page" />
              </View>
            ) : null}
            <HubDoorGrid>
              {HOME_DOWNLOAD_DOORS.map((door) => (
                <HubDoorTile
                  key={door.id}
                  emoji={door.emoji}
                  label={door.label}
                  testID={`home-download-${door.id}`}
                  onPress={() => {
                    if (door.installSurface) {
                      void install(door.installSurface);
                      return;
                    }
                    router.push(door.href);
                  }}
                />
              ))}
              <HubDoorTile emoji="📘" label="E-manual" onPress={() => router.push("/e-manual")} />
              {isPlatformOwner ? (
                <HubDoorTile
                  emoji="🏛️"
                  label="Admin"
                  onPress={() => router.push(ADMIN_TAB_HREF)}
                />
              ) : null}
            </HubDoorGrid>
          </>
        ) : null}

        {hubTab === "studios" ? (
          <HubDoorGrid>
            {HOME_STUDIO_DOORS.map((door) => (
              <HubDoorTile
                key={door.id}
                emoji={door.emoji}
                label={door.label}
                onPress={() => router.push(door.href)}
              />
            ))}
          </HubDoorGrid>
        ) : null}

        {hubTab === "daily" ? (
          <>
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
            {dailySignIn.error ? (
              <Text style={{ color: colors.gold, fontSize: 13 }}>{dailySignIn.error}</Text>
            ) : null}
            <DailyHubPanel />
            <PlatformSearchPanel compact />
            <AppPressable
              onPress={() => router.push("/(tabs)/messages")}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.42),
              }}
            >
              <Text pointerEvents="none" style={{ color: colors.foreground, fontWeight: "800" }}>
                Social feed
              </Text>
            </AppPressable>
            <SocialFeedPreview />
          </>
        ) : null}

        {hubTab === "board" ? <AiFreeBoardPanel compact /> : null}

        {hubTab === "doors" ? (
          <HubDoorGrid>
            {HOME_MAIN_DOORS.map((door) => (
              <HubDoorTile
                key={door.id}
                emoji={door.emoji}
                label={door.label}
                onPress={() => router.push(door.href)}
              />
            ))}
          </HubDoorGrid>
        ) : null}

      </TabPageScroll>
    </ScreenContainer>
  );
}
