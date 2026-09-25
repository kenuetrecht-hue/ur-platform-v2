import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { AiCreatorPanel } from "@/components/ai-creator-panel";
import { useColors } from "@/hooks/use-colors";
import { getCatalogCreator } from "@/lib/ai-creator-catalog";
import { isOwnerOpsAiId } from "@/lib/owner-platform-ops-catalog";
import { buildAiChatDisclosure, LEGAL_AI_DISCLAIMER } from "@/lib/platform-disclosure-copy";
import { LEGAL_SPECIALIST_IDS } from "@/lib/specialist-job-tools";

/**
 * Chat lives on its own screen, away from the tab bar, so the mic and Send
 * sit at the bottom of this page only.
 */
export default function AiSpecialistChatPage() {
  const params = useLocalSearchParams<{
    creatorId: string;
    prompt?: string;
    surface?: string;
    subscribe?: string;
  }>();
  const colors = useColors();
  const router = useRouter();
  const creatorId = typeof params.creatorId === "string" ? params.creatorId : "";
  const creator = creatorId ? getCatalogCreator(creatorId) : undefined;
  const creatorName = creator?.name ?? "this AI";
  const legalSpecialist = (LEGAL_SPECIALIST_IDS as readonly string[]).includes(creatorId);
  const aiWarning = legalSpecialist ? LEGAL_AI_DISCLAIMER : buildAiChatDisclosure(creatorName);

  if (!creatorId) {
    return <Redirect href="/ais" />;
  }

  if (isOwnerOpsAiId(creatorId)) {
    return <Redirect href={{ pathname: "/(tabs)/admin", params: { ai: creatorId } }} />;
  }

  const surface = params.surface;
  const initialSurface =
    params.subscribe === "1"
      ? ("pricing" as const)
      : surface === "build" || surface === "learn" || surface === "chat" || surface === "live" || surface === "pricing"
        ? surface
        : undefined;

  return (
    <ScreenContainer className="bg-background" style={{ flex: 1, minHeight: 0 }}>
      <TabScreenHeader
        compact
        icon={creator?.avatar ?? "💬"}
        title={creator ? `Chat · ${creator.name}` : "Chat"}
        backLabel="← Back"
        onBack={() =>
          router.replace({ pathname: "/ai/[creatorId]", params: { creatorId } })
        }
      />
      <View
        accessibilityRole="alert"
        accessibilityLabel={aiWarning}
        style={{
          marginHorizontal: 12,
          marginBottom: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 1,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13, lineHeight: 18 }}>
          ⚠️ You are talking to an AI
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 17, marginTop: 4 }}>
          {aiWarning}
        </Text>
      </View>
      <View style={{ flex: 1, minHeight: 0 }}>
        <AiCreatorPanel
          key={creatorId}
          creatorId={creatorId}
          creatorName={creator?.name ?? "AI"}
          creatorAvatar={creator?.avatar ?? "🤖"}
          hideChatHeader
          embedded={false}
          pageScroll={false}
          welcomeMessage={
            creator ? `Hi! I'm ${creator.name}. ${creator.mission} Ask me anything in my area — any language.` : undefined
          }
          initialPrompt={typeof params.prompt === "string" ? params.prompt : undefined}
          initialSurface={initialSurface}
        />
      </View>
    </ScreenContainer>
  );
}
