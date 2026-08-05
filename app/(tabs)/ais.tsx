import { useCallback, useEffect, useMemo, useState } from "react";

import {

  View,

  Text,

  TextInput,

  ActivityIndicator,

  StyleSheet,

  Pressable,

} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useColors } from "@/hooks/use-colors";

import { ScreenContainer } from "@/components/screen-container";

import { TabScreenHeader } from "@/components/tab-screen-header";

import { AiHubTabRow } from "@/components/ai-hub-tab-row";

import { AiSpecialistPicker } from "@/components/ai-specialist-picker";

import { AiCreatorPanel } from "@/components/ai-creator-panel";

import { AIDisclosureWrapper } from "@/components/ai-disclosure-wrapper";

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



/** Strip owner-only ops AIs — those live in Administration Dashboard only. */

function publicCreatorsOnly(list: AiCreatorCatalogEntry[]): AiCreatorCatalogEntry[] {

  return list.filter((c) => !OWNER_OPS_AI_IDS.includes(c.id));

}



export default function AIsScreen() {

  const colors = useColors();

  const router = useRouter();

  const params = useLocalSearchParams<{ group?: string; ai?: string; prompt?: string }>();

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



  const [categoryGroup, setCategoryGroup] = useState("platform");

  const [selectedAiId, setSelectedAiId] = useState<string>("contentmate");

  const [searchQuery, setSearchQuery] = useState("");



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

    <ScreenContainer className="bg-background" edges={["top", "left", "right"]}>

      <View style={styles.root}>

        <TabScreenHeader

          icon="🤖"

          title="AI Specialists"

          subtitle={`${totalCount} experts — chat or tap Learn to study the trade.`}

        />



        <Pressable

          onPress={() => router.push("/3d-workspace")}

          style={[

            styles.ownerLink,

            { backgroundColor: colors.surface, borderColor: colors.border },

          ]}

        >

          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>

            🎮 3D Workspace & Print Lab — design merchandise, connect your printer

          </Text>

        </Pressable>



        <View style={styles.catalogSection}>

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



          <AiHubTabRow

            tabs={categoryTabs}

            activeId={categoryGroup}

            onSelect={selectCategory}

          />



          {isLoading && !data ? (

            <ActivityIndicator style={{ marginVertical: 8 }} color={colors.primary} />

          ) : null}



          {isError ? (

            <Text style={[styles.hint, { color: colors.muted }]}>

              Using offline catalog — chat still works when connected.

            </Text>

          ) : null}



          {filteredCreators.length > 0 ? (

            <>

              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>

                {AI_HUB_CATEGORY_GROUPS.find((g) => g.id === categoryGroup)?.emoji ?? "✨"}{" "}

                {AI_HUB_CATEGORY_GROUPS.find((g) => g.id === categoryGroup)?.label ?? "All"}

                <Text style={{ color: colors.muted, fontWeight: "500" }}>

                  {" "}

                  · {filteredCreators.length} specialist

                  {filteredCreators.length === 1 ? "" : "s"}

                </Text>

              </Text>

              <AiSpecialistPicker

                specialists={filteredCreators}

                selectedId={selectedAiId}

                onSelect={setSelectedAiId}

              />

            </>

          ) : (

            <Text style={[styles.emptyText, { color: colors.muted }]}>

              No specialists in this category. Try another tab or search term.

            </Text>

          )}

        </View>



        <View style={styles.chatArea}>

          {selectedCreator ? (

            <AIDisclosureWrapper aiName={selectedCreator.name}>

              <AiCreatorPanel

                key={selectedCreator.id}

                creatorId={selectedCreator.id}

                creatorName={selectedCreator.name}

                creatorAvatar={selectedCreator.avatar}

                welcomeMessage={`Hi! I'm ${selectedCreator.name}. ${selectedCreator.mission} Ask me anything in my area — any language.`}

                initialPrompt={

                  params.ai === selectedCreator.id && typeof params.prompt === "string"

                    ? params.prompt

                    : undefined

                }

              />

            </AIDisclosureWrapper>

          ) : (

            <View style={[styles.placeholder, { borderColor: colors.border }]}>

              <Text style={{ color: colors.muted, textAlign: "center" }}>

                Select a specialist above to start chatting.

              </Text>

            </View>

          )}

        </View>

      </View>

    </ScreenContainer>

  );

}



const styles = StyleSheet.create({

  root: {

    flex: 1,

    minHeight: 0,

  },

  catalogSection: {

    flexShrink: 0,

    flexGrow: 0,

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

  ownerLink: {

    marginHorizontal: 12,

    marginBottom: 8,

    borderRadius: 12,

    borderWidth: 1.5,

    paddingVertical: 10,

    paddingHorizontal: 12,

    alignItems: "center",

  },

  sectionLabel: {

    fontSize: 14,

    fontWeight: "700",

    paddingHorizontal: 16,

    paddingTop: 6,

    paddingBottom: 2,

    lineHeight: 20,

  },

  hint: {

    fontSize: 12,

    paddingHorizontal: 16,

    paddingBottom: 4,

  },

  chatArea: {

    flex: 1,

    minHeight: 200,

    paddingHorizontal: 12,

    paddingTop: 8,

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


