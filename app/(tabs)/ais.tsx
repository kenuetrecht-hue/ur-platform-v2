import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { AiHubTabRow } from "@/components/ai-hub-tab-row";
import { AiSpecialistPicker } from "@/components/ai-specialist-picker";
import {
  AI_CREATOR_CATALOG,
  type AiCreatorCatalogEntry,
} from "@/lib/ai-creator-catalog";
import {
  AI_HUB_CATEGORY_GROUPS,
  filterCreatorsByGroup,
  nextHubSelection,
} from "@/lib/ai-hub-navigation";
import { OWNER_OPS_AI_IDS, isOwnerOpsAiId } from "@/lib/owner-platform-ops-catalog";
import { trpc } from "@/lib/trpc";
import { HiveTownHallPanel } from "@/components/hive-town-hall-panel";
import { HubTabBar } from "@/components/hub-tab-bar";
import { TabPageScroll } from "@/components/tab-page-scroll";
import { AppPressable } from "@/components/app-pressable";

function publicCreatorsOnly(list: AiCreatorCatalogEntry[]): AiCreatorCatalogEntry[] {
  return list.filter((c) => !OWNER_OPS_AI_IDS.includes(c.id));
}

export default function AIsScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ group?: string; ai?: string; prompt?: string; subscribe?: string; surface?: string }>();
  const [hubMode, setHubMode] = useState<"chat" | "townHall">("chat");
  const [categoryGroup, setCategoryGroup] = useState("platform");
  const [selectedAiId, setSelectedAiId] = useState<string>("contentmate");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError } = trpc.aiCreators.list.useQuery(undefined, {
    staleTime: 60_000,
    retry: 1,
  });

  const creators = useMemo<AiCreatorCatalogEntry[]>(() => {
    if (data?.creators?.length) {
      return publicCreatorsOnly(
        data.creators.map((c) => ({
          id: c.id,
          name: c.name,
          avatar: c.avatar,
          category: c.category,
          mission: c.mission,
        })),
      );
    }
    return publicCreatorsOnly([...AI_CREATOR_CATALOG]);
  }, [data]);

  const categoryTabs = useMemo(
    () =>
      AI_HUB_CATEGORY_GROUPS.map((g) => ({
        id: g.id,
        label: g.label,
        emoji: g.emoji,
      })),
    [],
  );

  const filteredCreators = useMemo(
    () => filterCreatorsByGroup(creators, categoryGroup, searchQuery),
    [creators, categoryGroup, searchQuery],
  );

  const selectedCreator = useMemo(
    () => creators.find((c) => c.id === selectedAiId) ?? null,
    [creators, selectedAiId],
  );

  const openSpecialistPage = useCallback(
    (id: string) => {
      setSelectedAiId(id);
      router.push({ pathname: "/ai/[creatorId]", params: { creatorId: id } });
    },
    [router],
  );

  const selectCategory = useCallback(
    (groupId: string) => {
      if (groupId === "ownerOps") return;
      setCategoryGroup(groupId);
      const inGroup = filterCreatorsByGroup(creators, groupId, searchQuery);
      if (inGroup.length > 0) {
        setSelectedAiId(inGroup[0]!.id);
      }
    },
    [creators, searchQuery],
  );

  const pickSpecialist = useCallback(
    (id: string) => {
      openSpecialistPage(id);
    },
    [openSpecialistPage],
  );

  useEffect(() => {
    if (typeof params.ai === "string" && isOwnerOpsAiId(params.ai)) {
      router.replace({ pathname: "/(tabs)/admin", params: { ai: params.ai } });
      return;
    }
    if (typeof params.group === "string" && params.group === "ownerOps") {
      router.replace("/(tabs)/admin");
      return;
    }
    if (typeof params.group === "string" && params.group) {
      selectCategory(params.group);
    }
  }, [params.group, params.ai, selectCategory, router]);

  useEffect(() => {
    if (typeof params.ai !== "string" || !params.ai || isOwnerOpsAiId(params.ai)) return;
    router.replace({
      pathname: "/ai/[creatorId]",
      params: {
        creatorId: params.ai,
        ...(typeof params.prompt === "string" ? { prompt: params.prompt } : {}),
        ...(typeof params.surface === "string" ? { surface: params.surface } : {}),
        ...(typeof params.subscribe === "string" ? { subscribe: params.subscribe } : {}),
      },
    });
  }, [params.ai, params.prompt, params.surface, params.subscribe, router]);

  useEffect(() => {
    const nextId = nextHubSelection({
      deepLinkedAiId: typeof params.ai === "string" ? params.ai : undefined,
      selectedAiId,
      visibleIds: filteredCreators.map((c) => c.id),
    });
    if (nextId !== selectedAiId) {
      setSelectedAiId(nextId);
    }
  }, [filteredCreators, selectedAiId, params.ai]);

  return (
    <ScreenContainer className="bg-background" style={styles.screen}>
      <View style={styles.root}>
        <View style={styles.chrome}>
          <TabScreenHeader compact icon="🤖" title="AIs" />
          <HubTabBar
            tabs={[
              { id: "chat", label: "Chat", emoji: "💬" },
              { id: "townHall", label: "Town Hall", emoji: "🏛️" },
            ]}
            activeId={hubMode}
            onSelect={(id) => setHubMode(id === "townHall" ? "townHall" : "chat")}
          />

          {hubMode === "chat" && selectedCreator ? (
            <AppPressable
              onPress={() => openSpecialistPage(selectedCreator.id)}
              testID="ai-browse-specialists"
              style={[
                styles.selectedBar,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text pointerEvents="none" style={{ fontSize: 20 }}>
                {selectedCreator.avatar}
              </Text>
              <View pointerEvents="none" style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>
                  {selectedCreator.name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>
                  Open this AI
                </Text>
              </View>
              <Text pointerEvents="none" style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
                Open
              </Text>
            </AppPressable>
          ) : null}
        </View>

        {hubMode === "townHall" ? (
          <View style={styles.fill}>
            <HiveTownHallPanel />
          </View>
        ) : (
          <TabPageScroll contentContainerStyle={styles.bodyScroll}>
            <View style={styles.catalogHeader}>
              <Text style={{ color: colors.onWhite, fontWeight: "700", fontSize: 13 }}>
                Choose a specialist
              </Text>
              {selectedCreator ? (
                <AppPressable
                  onPress={() => openSpecialistPage(selectedCreator.id)}
                  hitSlop={8}
                >
                  <Text pointerEvents="none" style={{ color: colors.onWhite, fontWeight: "700", fontSize: 12 }}>
                    Done ▲
                  </Text>
                </AppPressable>
              ) : null}
            </View>

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search specialists…"
              placeholderTextColor={colors.muted}
              style={[
                styles.search,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />

            <AiHubTabRow tabs={categoryTabs} activeId={categoryGroup} onSelect={selectCategory} />

            {isLoading && !data ? (
              <ActivityIndicator style={{ marginVertical: 8 }} color={colors.primary} />
            ) : null}

            {isError ? (
              <Text style={[styles.hint, { color: colors.onWhite }]}>
                Using offline catalog — chat still works when connected.
              </Text>
            ) : null}

            {filteredCreators.length > 0 ? (
              <AiSpecialistPicker
                specialists={filteredCreators}
                selectedId={selectedAiId}
                onSelect={pickSpecialist}
              />
            ) : (
              <Text style={[styles.emptyText, { color: colors.onWhite }]}>
                No specialists in this category.
              </Text>
            )}
          </TabPageScroll>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0 },
  root: {
    flex: 1,
    minHeight: 0,
  },
  fill: {
    flex: 1,
    minHeight: 0,
  },
  chrome: {
    flexShrink: 0,
  },
  bodyScroll: {
    padding: 8,
    paddingTop: 0,
    gap: 8,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectedBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  catalogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 6,
  },
  search: {
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  placeholder: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    padding: 16,
    textAlign: "center",
    fontSize: 14,
  },
});
