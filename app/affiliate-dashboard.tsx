import { Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { AffiliateDashboardPanel } from "@/components/affiliate-dashboard-panel";

export default function AffiliateDashboardScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer className="bg-background">
          <TabScreenHeader
            icon="🔗"
            title="Affiliate Dashboard"
            subtitle="Share links · earn $5 per creator after their 5th transaction."
          />
          <AffiliateDashboardPanel />
      </ScreenContainer>
    </>
  );
}
