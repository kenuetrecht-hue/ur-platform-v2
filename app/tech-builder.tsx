import { Stack } from "expo-router";
import { View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { AiCreatorPanel } from "@/components/ai-creator-panel";
import { PlatformSectionGate } from "@/components/platform-section-gate";

export default function TechBuilderScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer className="bg-background">
        <TabScreenHeader
          icon="💻"
          title="TechBuilder"
          subtitle="UR Platform lead coder — chat, learn, build, voice, hive, and live labs."
        />
        <View style={{ flex: 1, minHeight: 0 }}>
          <PlatformSectionGate sectionId="forge_sandbox">
            <AiCreatorPanel
              creatorId="ai-coder-001"
              creatorName="TechBuilder"
              creatorAvatar="💻"
              welcomeMessage="I'm TechBuilder — your UR Platform coding partner. I work on the same stack UR runs: Expo, tRPC, MySQL, Supabase. Ask me to debug, teach, or open the Build tab to ship in the sandbox."
              hideChatHeader
            />
          </PlatformSectionGate>
        </View>
      </ScreenContainer>
    </>
  );
}
