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
            subtitle="Share links. $5 only after the creator's free 24 hours, then five later sales."
          />
          <AffiliateDashboardPanel />
      </ScreenContainer>
    </>
  );
}
