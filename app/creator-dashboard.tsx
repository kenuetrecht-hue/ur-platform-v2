import { Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { ContentCreatorDashboardPanel } from "@/components/content-creator-dashboard-panel";

export default function CreatorDashboardScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer className="bg-background">
          <TabScreenHeader
            icon="🎬"
            title="Content Creator Dashboard"
            subtitle="Schedule classes · ContentMate AI · Facebook promo · instant payouts"
          />
          <ContentCreatorDashboardPanel />
      </ScreenContainer>
    </>
  );
}
