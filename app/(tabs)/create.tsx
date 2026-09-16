import { useState } from "react";
import { ScrollView, View, Text, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { PersonalAIChat } from "@/components/personal-ai-chat";
import { VoiceChatInterface } from "@/components/voice-chat-interface";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";
import { HubTabBar } from "@/components/hub-tab-bar";
import { HubDoorGrid, HubDoorTile } from "@/components/hub-door-tile";
import { CREATE_HUB_TABS } from "@/lib/home-hub";
import { AppPressable } from "@/components/app-pressable";
import { withAlpha } from "@/lib/brand-theme";

const CREATE_ICONS: Record<string, string> = {
  video: "🎬",
  cartoon: "🎞️",
  music: "🎚️",
  audio: "🎵",
  image: "🖼️",
  text: "📝",
  ai: "✨",
  templates: "📋",
  calendar: "📅",
  drafts: "📄",
};

export default function CreateScreen() {
  const colors = useColors();
  const router = useRouter();
  const [showAIChat, setShowAIChat] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [hubTab, setHubTab] = useState("make");
  const createTab = consolidatedNavigation.getTab("create");
  const subMenu = createTab?.subMenu ?? [];

  return (
    <ScreenContainer className="bg-background">
      <TabScreenHeader compact icon="✏️" title="Create" />
      <HubTabBar tabs={CREATE_HUB_TABS} activeId={hubTab} onSelect={setHubTab} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {hubTab === "make" ? (
          <HubDoorGrid>
            {subMenu.map((item) => (
              <HubDoorTile
                key={item.id}
                emoji={CREATE_ICONS[item.id] ?? "📦"}
                label={item.label}
                onPress={() => {
                  if (item.id === "ai") setShowAIChat(true);
                  else if (item.route) router.push(item.route as never);
                }}
              />
            ))}
          </HubDoorGrid>
        ) : null}

        {hubTab === "talk" ? (
          <View style={{ gap: 10 }}>
            <AppPressable
              onPress={() => setShowAIChat(true)}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 14,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text pointerEvents="none" style={{ color: "#fff", fontWeight: "700" }}>
                Text AI
              </Text>
            </AppPressable>
            <AppPressable
              onPress={() => setShowVoiceChat(true)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                alignItems: "center",
                borderWidth: 1,
                borderColor: withAlpha(colors.secondary, 0.4),
              }}
            >
              <Text pointerEvents="none" style={{ color: colors.foreground, fontWeight: "700" }}>
                Voice AI
              </Text>
            </AppPressable>
          </View>
        ) : null}
      </ScrollView>

      <PersonalAIChat visible={showAIChat} onClose={() => setShowAIChat(false)} />

      <Modal visible={showVoiceChat} animationType="slide">
        <VoiceChatInterface
          aiName="UR Assistant"
          aiCategory="Creator"
          onClose={() => setShowVoiceChat(false)}
        />
      </Modal>
    </ScreenContainer>
  );
}
