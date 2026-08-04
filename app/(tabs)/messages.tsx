import { View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { ScreenContainer } from "@/components/screen-container";
import { WarningBanner } from "@/components/warning-banner";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { PersonalAIInterface } from "@/components/personal-ai-interface";
import { AIDisclosureWrapper } from "@/components/ai-disclosure-wrapper";

export default function MessagesScreen() {
  const { user } = useAuth();

  return (
    <ScreenContainer className="bg-background" edges={["top", "left", "right"]}>
      <View style={{ flex: 1, minHeight: 0 }}>
        <WarningBanner variant="compact" />
        <TabScreenHeader
          icon="💬"
          title="Messages"
          subtitle="Chat with your personal AI assistant."
        />
        <View
          style={{
            flex: 1,
            minHeight: 0,
            paddingHorizontal: 12,
            paddingBottom: 4,
          }}
        >
          <AIDisclosureWrapper aiName="Personal AI Assistant">
            <PersonalAIInterface creatorId={user?.id ?? "guest"} />
          </AIDisclosureWrapper>
        </View>
      </View>
    </ScreenContainer>
  );
}
