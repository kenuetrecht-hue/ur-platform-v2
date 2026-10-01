import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { CreatorAIInterface } from "@/components/creator-ai-interface";
import { useColors } from "@/hooks/use-colors";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import {
  BUSINESS_STEWARD_AI_ID,
  OWNER_PLATFORM_OPS_CATALOG,
  WORLD_DIRECTOR_AI_ID,
  isOwnerOpsAiId,
} from "@/lib/owner-platform-ops-catalog";
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
  const ownerOnly = creatorId === BUSINESS_STEWARD_AI_ID || creatorId === WORLD_DIRECTOR_AI_ID;

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

  return (
    <ScreenContainer className="bg-background" style={{ flex: 1, minHeight: 0 }}>
      <TabScreenHeader
        compact
        icon={creator.avatar}
        title={`Chat · ${creator.name}`}
        backLabel="← Back"
        onBack={() => router.replace("/(tabs)/admin")}
      />
      <View style={{ flex: 1, minHeight: 0 }}>
        <CreatorAIInterface
          key={creatorId}
          creatorId={creatorId}
          creatorName={creator.name}
          creatorAvatar={creator.avatar}
          hideHeader
          embedded={false}
          pageScroll={false}
          speakReplies
          toolRail="left"
          welcomeMessage={welcomeFor(creatorId, creator.name)}
        />
      </View>
    </ScreenContainer>
  );
}
