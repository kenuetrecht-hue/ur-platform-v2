import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { SocialHubPanel } from "@/components/social-hub-panel";

export default function MessagesScreen() {
  return (
    <ScreenContainer className="bg-background">
      <TabScreenHeader
        icon="💬"
        title="Social Hub"
        subtitle="Public feed, friends, DMs, creator follows, and video chat — free posting for everyone."
      />
      <SocialHubPanel />
    </ScreenContainer>
  );
}
