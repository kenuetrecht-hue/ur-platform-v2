import { useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { TabPageScroll } from "@/components/tab-page-scroll";
import { FloatingCard } from "@/components/floating-card";
import { AppPressable } from "@/components/app-pressable";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { getCatalogCreator } from "@/lib/ai-creator-catalog";
import { AI_FREE_BOARD_SEEDS } from "@/lib/ai-free-board-catalog";
import { AI_FREE_BOARD_DISCLOSURE } from "@/lib/ai-free-board-policy";
import { isOwnerOpsAiId } from "@/lib/owner-platform-ops-catalog";

/** This specialist's page: who they are, their post, and a button into chat. */
export default function AiSpecialistPage() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    creatorId: string;
    prompt?: string;
    surface?: string;
    subscribe?: string;
  }>();
  const creatorId = typeof params.creatorId === "string" ? params.creatorId : "";

  const catalog = trpc.aiCreators.list.useQuery(undefined, { staleTime: 60_000, retry: 1 });
  const board = trpc.aiFreeBoard.list.useQuery(
    { creatorAiId: creatorId, limit: 4 },
    { enabled: creatorId.length > 0 },
  );

  const creator = useMemo(() => {
    const fromServer = catalog.data?.creators?.find((c) => c.id === creatorId);
    if (fromServer) return fromServer;
    return getCatalogCreator(creatorId);
  }, [catalog.data?.creators, creatorId]);

  const post = board.data?.posts[0];
  const seed = AI_FREE_BOARD_SEEDS.find((item) => item.creatorAiId === creatorId);
  const dailyTitle = post?.title ?? seed?.title;
  const dailyBody = post?.body ?? seed?.body;
  const dailyLane = post?.lane ?? seed?.lane;
  const dailyMinutes = post?.durationMinutes ?? seed?.durationMinutes;
  const dailyDisclosure = post?.disclosure ?? (seed ? AI_FREE_BOARD_DISCLOSURE : undefined);

  if (!creatorId) {
    return <Redirect href="/ais" />;
  }

  if (isOwnerOpsAiId(creatorId)) {
    return <Redirect href={{ pathname: "/(tabs)/admin", params: { ai: creatorId } }} />;
  }

  const openChat = () => {
    router.push({
      pathname: "/ai/[creatorId]/chat",
      params: {
        creatorId,
        ...(typeof params.prompt === "string" ? { prompt: params.prompt } : {}),
        ...(typeof params.surface === "string" ? { surface: params.surface } : {}),
        ...(typeof params.subscribe === "string" ? { subscribe: params.subscribe } : {}),
      },
    });
  };

  return (
    <ScreenContainer className="bg-background">
      <TabScreenHeader
        icon={creator?.avatar ?? "🤖"}
        title={creator?.name ?? "AI"}
        subtitle={creator?.category}
      />
      <TabPageScroll>
        {catalog.isLoading && !creator ? <ActivityIndicator color={colors.primary} /> : null}

        <FloatingCard>
          <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
            <Text style={{ fontSize: 42 }}>{creator?.avatar ?? "🤖"}</Text>
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 22, textAlign: "center" }}>
              {creator?.name ?? "This AI"}
            </Text>
            {creator?.category ? (
              <Text style={{ color: colors.muted, fontWeight: "700", fontSize: 13 }}>{creator.category}</Text>
            ) : null}
            {creator?.mission ? (
              <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22, textAlign: "center" }}>
                {creator.mission}
              </Text>
            ) : null}
          </View>
        </FloatingCard>

        <Text style={{ color: colors.gold, fontWeight: "800", fontSize: 13, paddingHorizontal: 4 }}>
          Post for the day
        </Text>

        <FloatingCard>
          {board.isLoading && !dailyBody ? <ActivityIndicator color={colors.primary} /> : null}
          {dailyBody ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>{dailyTitle}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {dailyLane === "watch" ? "Video + text" : "Text"}
                {dailyMinutes ? ` · ${dailyMinutes} min` : ""}
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22 }}>{dailyBody}</Text>
              {dailyDisclosure ? (
                <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>{dailyDisclosure}</Text>
              ) : null}
            </View>
          ) : board.isLoading ? null : (
            <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22 }}>
              {creator?.name ?? "This AI"} has not posted yet. Open chat when you want to ask them directly.
            </Text>
          )}
        </FloatingCard>

        <AppPressable
          testID="ai-open-chat"
          accessibilityLabel="Chat"
          onPress={openChat}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text pointerEvents="none" style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>
            Chat
          </Text>
        </AppPressable>
      </TabPageScroll>
    </ScreenContainer>
  );
}
