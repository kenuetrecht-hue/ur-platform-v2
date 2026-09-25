import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { CreatorAIInterface } from "@/components/creator-ai-interface";
import { useColors } from "@/hooks/use-colors";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { trpc } from "@/lib/trpc";
import {
  BUSINESS_STEWARD_AI_ID,
  OWNER_PLATFORM_OPS_CATALOG,
  WORLD_DIRECTOR_AI_ID,
  isOwnerOpsAiId,
} from "@/lib/owner-platform-ops-catalog";
import { OWNER_OPS_AUTO_SPEAK_MONTHLY_CENTS } from "@/lib/owner-ops-auto-speak";
import { buildAiChatDisclosure } from "@/lib/platform-disclosure-copy";
import { OWNER_REMEDIATION_CONFIRM_PHRASE } from "@/lib/platform-ops-remediation-types";

function welcomeFor(id: string, name: string): string {
  if (id === BUSINESS_STEWARD_AI_ID) {
    return "Owner channel active. I'm Business Steward AI — your private operator for urplatform.llc. Launch ad budget is $2/day and $60/month (text + stills). Change store prices here or say SET PRICE monthly text 29.99. I do not file taxes or deploy code.";
  }
  if (id === WORLD_DIRECTOR_AI_ID) {
    return "Owner channel active. I'm World Director AI — I watch UR World and in-platform talk. Red flags pause the member and land here in English. Your plaza avatar is the UR Sheriff (casual, not a cop uniform). DRESS OWNER · MAKE OWNER OUTFIT weekend shirt #e7e0d4 jeans #3a4f73 shoes #f4f1ea · SET OWNER TITLE UR Sheriff. Catalog: SET WORLD PACK PRICE civic-dawn 2.49. Apparel is never $5.00.";
  }
  return `Owner channel active. I'm ${name}. I can diagnose, isolate a broken section, and draft a fix. Nothing is finalized until you type ${OWNER_REMEDIATION_CONFIRM_PHRASE} in Owner Ops.`;
}

/** Private chat room for one Administration AI. No tab bar under the mic. */
export default function OwnerOpsAiChatPage() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ creatorId?: string }>();
  const creatorId = typeof params.creatorId === "string" ? params.creatorId : "";
  const creator = OWNER_PLATFORM_OPS_CATALOG.find((entry) => entry.id === creatorId);
  const { isPlatformOwner, canAccessAdminDashboard, hasAdminPermission, isLoading } = usePlatformOwner();
  const canChat = canAccessAdminDashboard && hasAdminPermission("chat_ops_ai");
  const voice = trpc.platformOps.ownerOpsAutoSpeak.useQuery(undefined, { enabled: canChat });
  const ownerOnly = creatorId === BUSINESS_STEWARD_AI_ID || creatorId === WORLD_DIRECTOR_AI_ID;
  const monthlyUsd = (OWNER_OPS_AUTO_SPEAK_MONTHLY_CENTS / 100).toLocaleString("en-US");

  if (!creatorId || !isOwnerOpsAiId(creatorId) || !creator) {
    return <Redirect href="/(tabs)/admin" />;
  }

  if (!isLoading && (!canChat || (ownerOnly && !isPlatformOwner))) {
    return <Redirect href="/(tabs)/admin" />;
  }

  if (isLoading) {
    return (
      <ScreenContainer className="bg-background">
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      </ScreenContainer>
    );
  }

  const aiWarning = buildAiChatDisclosure(creator.name);
  const voiceNote = voice.data?.autoSpeak
    ? "They speak the reply, and the same words stay in this chat so you can read them again."
    : `Replies stay on this page as text. They speak automatically once the site makes $${monthlyUsd} in a month.`;

  return (
    <ScreenContainer className="bg-background" style={{ flex: 1, minHeight: 0 }}>
      <TabScreenHeader
        compact
        icon={creator.avatar}
        title={`Chat · ${creator.name}`}
        backLabel="← Back"
        onBack={() => router.replace("/(tabs)/admin")}
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
          gap: 4,
        }}
      >
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13, lineHeight: 18 }}>
          ⚠️ You are talking to an AI
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 17 }}>{aiWarning}</Text>
        <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 17 }}>{voiceNote}</Text>
      </View>
      <View style={{ flex: 1, minHeight: 0 }}>
        <CreatorAIInterface
          key={creatorId}
          creatorId={creatorId}
          creatorName={creator.name}
          creatorAvatar={creator.avatar}
          hideHeader
          embedded={false}
          pageScroll={false}
          speakReplies={voice.data?.autoSpeak === true}
          welcomeMessage={welcomeFor(creatorId, creator.name)}
        />
      </View>
    </ScreenContainer>
  );
}
