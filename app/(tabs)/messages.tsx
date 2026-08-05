import { View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { SocialHubPanel } from "@/components/social-hub-panel";

export default function MessagesScreen() {
  return (
    <ScreenContainer className="bg-background">
      <TabScreenHeader
        icon="🌐"
        title="Social Hub"
        subtitle="Internet Center mail, public feed, friends & creators"
      />
      <View style={{ flex: 1, minHeight: 0 }}>
        <SocialHubPanel />
      </View>
    </ScreenContainer>
  );
}
