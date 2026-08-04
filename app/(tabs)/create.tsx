import { useState } from "react";
import { ScrollView, View, Text, Pressable, Modal } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { WarningBanner } from "@/components/warning-banner";
import { DemoSection } from "@/components/demo-section";
import { PersonalAIChat } from "@/components/personal-ai-chat";
import { VoiceChatInterface } from "@/components/voice-chat-interface";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";
import { IconSymbol } from "@/components/ui/icon-symbol";

const CREATE_ICONS: Record<string, string> = {
  video: "🎬",
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
  const [showAIChat, setShowAIChat] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const createTab = consolidatedNavigation.getTab("create");
  const subMenu = createTab?.subMenu ?? [];

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <WarningBanner variant="compact" />

        <TabScreenHeader
          icon="✏️"
          title="Create"
          subtitle="Produce videos, audio, images, and AI-assisted content."
        />

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <DemoSection
            title="AI Tools"
            description="Launch your creative assistants."
            icon="🤖"
            variant="info"
          >
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() => setShowAIChat(true)}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Text AI</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowVoiceChat(true)}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                  Voice AI
                </Text>
              </Pressable>
            </View>
          </DemoSection>

          {subMenu.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (item.id === "ai") setShowAIChat(true);
              }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Text style={{ fontSize: 28 }}>{CREATE_ICONS[item.id] ?? "📦"}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.foreground,
                  }}
                >
                  {item.label}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  Start a new {item.label.toLowerCase()} project
                </Text>
              </View>
              <IconSymbol
                name="chevron.right"
                size={18}
                color={colors.muted}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <PersonalAIChat
        visible={showAIChat}
        onClose={() => setShowAIChat(false)}
      />

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
