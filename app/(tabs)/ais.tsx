import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { AiHubTabRow } from "@/components/ai-hub-tab-row";
import { AiSpecialistPicker } from "@/components/ai-specialist-picker";
import { AiCreatorPanel } from "@/components/ai-creator-panel";
import {
  AI_CREATOR_CATALOG,
  type AiCreatorCatalogEntry,
} from "@/lib/ai-creator-catalog";
import {
  AI_HUB_CATEGORY_GROUPS,
  filterCreatorsByGroup,
} from "@/lib/ai-hub-navigation";
import { OWNER_OPS_AI_IDS, isOwnerOpsAiId } from "@/lib/owner-platform-ops-catalog";
import { trpc } from "@/lib/trpc";
import { HiveTownHallPanel } from "@/components/hive-town-hall-panel";
import { LAYOUT_OVERLAP } from "@/lib/layout-overlap";

function publicCreatorsOnly(list: AiCreatorCatalogEntry[]): AiCreatorCatalogEntry[] {
  return list.filter((c) => !OWNER_OPS_AI_IDS.includes(c.id));
}

export default function AIsScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ group?: string; ai?: string; prompt?: string; subscribe?: string; surface?: string }>();
  const [catalogOpen, setCatalogOpen] = useState(false);
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

  const creatorWelcomeMessage = useMemo(() => {
    if (!selectedCreator) return undefined;
    return `Hi! I'm ${selectedCreator.name}. ${selectedCreator.mission} Ask me anything in my area — any language.`;
  }, [selectedCreator?.id, selectedCreator?.name, selectedCreator?.mission]);

  const creatorInitialPrompt = useMemo(() => {
    if (!selectedCreator || params.ai !== selectedCreator.id) return undefined;
    return typeof params.prompt === "string" ? params.prompt : undefined;
  }, [params.ai, params.prompt, selectedCreator?.id]);

  const creatorInitialSurface = useMemo(() => {
    if (params.subscribe === "1") return "pricing" as const;
    const surface = params.surface;
    if (surface === "build" || surface === "learn" || surface === "chat" || surface === "live" || surface === "pricing") {
      return surface;
    }
    return undefined;
  }, [params.subscribe, params.surface]);

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

  const pickSpecialist = useCallback((id: string) => {
    setSelectedAiId(id);
    setCatalogOpen(false);
  }, []);

  useEffect(() => {
    if (typeof params.ai === "string" && isOwnerOpsAiId(params.ai)) {
      router.replace("/owner-ops");
      return;
    }
    if (typeof params.group === "string" && params.group === "ownerOps") {
      router.replace("/owner-ops");
      return;
    }
    if (typeof params.group === "string" && params.group) {
      selectCategory(params.group);
    }
  }, [params.group, params.ai, selectCategory, router]);

  useEffect(() => {
    if (typeof params.ai !== "string" || !params.ai || isOwnerOpsAiId(params.ai)) return;
    const creator = creators.find((c) => c.id === params.ai);
    if (!creator) return;
    setSelectedAiId(params.ai);
    setCatalogOpen(false);
    const group = AI_HUB_CATEGORY_GROUPS.find(
      (g) => g.categories.length > 0 && g.categories.includes(creator.category),
    );
    if (group) {
      setCategoryGroup(group.id);
    }
  }, [params.ai, creators]);

  useEffect(() => {
    if (filteredCreators.length === 0) return;
    const visible = filteredCreators.some((c) => c.id === selectedAiId);
    if (!visible) {
      setSelectedAiId(filteredCreators[0]!.id);
    }
  }, [filteredCreators, selectedAiId]);

  const totalCount = data?.total ?? AI_CREATOR_CATALOG.length;

  return (
    <ScreenContainer className="bg-background" style={styles.screen}>
      <View style={styles.root}>
        <View style={styles.chrome}>
          <TabScreenHeader
            compact
            icon="🤖"
            title="AI Specialists"
            subtitle={
              hubMode === "townHall"
                ? "Town Hall — talk to the whole panel at once."
                : `${totalCount} experts — pick one, chat below.`
            }
          />

          <View style={[styles.modeRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Pressable
              onPress={() => setHubMode("chat")}
              style={[styles.modeBtn, hubMode === "chat" && { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: hubMode === "chat" ? "#fff" : colors.foreground, fontWeight: "700", fontSize: 12 }}>
                💬 1:1 Chat
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setHubMode("townHall")}
              style={[styles.modeBtn, hubMode === "townHall" && { backgroundColor: colors.primary }]}
            >
              <Text
                style={{
                  color: hubMode === "townHall" ? "#fff" : colors.foreground,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                🏛️ Town Hall
              </Text>
            </Pressable>
          </View>

          {hubMode === "chat" ? (
            <>
              {selectedCreator && !catalogOpen ? (
                <Pressable
                  onPress={() => setCatalogOpen(true)}
                  style={[
                    styles.selectedBar,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>{selectedCreator.avatar}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>
                      {selectedCreator.name}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>
                      Tap to change specialist
                    </Text>
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Browse ▼</Text>
                </Pressable>
              ) : (
                <View style={styles.catalogBlock}>
                  <View style={styles.catalogHeader}>
                    <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
                      Choose a specialist
                    </Text>
                    {selectedCreator ? (
                      <Pressable onPress={() => setCatalogOpen(false)} hitSlop={8}>
                        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Done ▲</Text>
                      </Pressable>
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
                    <Text style={[styles.hint, { color: colors.muted }]}>
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
                    <Text style={[styles.emptyText, { color: colors.muted }]}>
                      No specialists in this category.
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : null}
        </View>

        <View style={styles.body}>
          {hubMode === "townHall" ? (
            <HiveTownHallPanel />
          ) : selectedCreator ? (
            <AiCreatorPanel
              key={selectedCreator.id}
              creatorId={selectedCreator.id}
              creatorName={selectedCreator.name}
              creatorAvatar={selectedCreator.avatar}
              hideChatHeader
              welcomeMessage={creatorWelcomeMessage}
              initialPrompt={creatorInitialPrompt}
              initialSurface={creatorInitialSurface}
              overlapHeaderHeight={LAYOUT_OVERLAP.AIS_TAB_CHROME_HEIGHT}
            />
          ) : (
            <View style={[styles.placeholder, { borderColor: colors.border }]}>
              <Text style={{ color: colors.muted, textAlign: "center" }}>
                Select a specialist to start chatting.
              </Text>
            </View>
          )}
        </View>
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
  chrome: {
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 4,
    paddingBottom: 2,
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
  catalogBlock: {
    maxHeight: 280,
    marginBottom: 4,
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
