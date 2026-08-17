import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import {
  AI_HUB_CATEGORY_GROUPS,
  filterCreatorsByGroup,
  firstCreatorInGroup,
} from "@/lib/ai-hub-navigation";
import { AI_CREATOR_CATALOG, type AiCreatorCatalogEntry } from "@/lib/ai-creator-catalog";
import { LANDING_DEMO_CREATOR_IDS } from "@/lib/landing-demo-policy";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { LandingCategoryTabRow } from "@/components/landing/landing-category-tab-row";

const LANDING_GROUPS = AI_HUB_CATEGORY_GROUPS.filter((g) => g.id !== "ownerOps");

type Props = {
  selectedCreatorId: string;
  onSelectCreator: (id: string) => void;
};

function demoCreatorsOnly(list: AiCreatorCatalogEntry[]): AiCreatorCatalogEntry[] {
  const allowed = new Set<string>(LANDING_DEMO_CREATOR_IDS);
  return list.filter((c) => allowed.has(c.id));
}

export function LandingAiCategoryHub({ selectedCreatorId, onSelectCreator }: Props) {
  const [categoryGroup, setCategoryGroup] = useState("all");

  const creators = useMemo(() => demoCreatorsOnly([...AI_CREATOR_CATALOG]), []);

  const filtered = useMemo(
    () => filterCreatorsByGroup(creators, categoryGroup),
    [creators, categoryGroup],
  );

  const activeGroupLabel =
    LANDING_GROUPS.find((g) => g.id === categoryGroup)?.label ?? "this category";

  const selectCategory = useCallback(
    (groupId: string) => {
      if (!LANDING_GROUPS.some((g) => g.id === groupId)) return;
      setCategoryGroup(groupId);
      const next = firstCreatorInGroup(creators, groupId);
      if (next) {
        onSelectCreator(next.id);
      }
    },
    [creators, onSelectCreator],
  );

  const selectCreator = useCallback(
    (id: string) => {
      if (!LANDING_DEMO_CREATOR_IDS.includes(id as (typeof LANDING_DEMO_CREATOR_IDS)[number])) {
        return;
      }
      onSelectCreator(id);
    },
    [onSelectCreator],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTag}>AI SPECIALISTS</Text>
      <Text style={styles.title}>Browse by category</Text>
      <Text style={styles.sub}>
        Same hub layout as the app — pick a category, then try one free preview message below.
      </Text>

      <LandingCategoryTabRow groups={LANDING_GROUPS} activeId={categoryGroup} onSelect={selectCategory} />

      {filtered.length > 0 ? (
        <View style={styles.grid}>
          {filtered.map((creator) => {
            const active = creator.id === selectedCreatorId;
            return (
              <Pressable
                key={creator.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => selectCreator(creator.id)}
                style={[styles.card, active && styles.cardActive]}
              >
                <Text style={styles.cardAvatar}>{creator.avatar}</Text>
                <Text style={styles.cardName} numberOfLines={1}>
                  {creator.name}
                </Text>
                <Text style={styles.cardMission} numberOfLines={2}>
                  {creator.mission}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No preview specialists in {activeGroupLabel}</Text>
          <Text style={styles.empty}>
            Create a free account to unlock every specialist in this category — full chat, live
            sessions, and your creator hub.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.borderBrand,
    backgroundColor: T.bgElevated,
    padding: 18,
    marginBottom: 20,
  },
  sectionTag: {
    color: T.brandPurpleLight,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: { color: T.text, fontSize: 22, fontWeight: "900", marginBottom: 6 },
  sub: { color: T.muted, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 148,
    maxWidth: "48%",
    flexBasis: "47%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg,
    padding: 12,
    minHeight: 108,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  cardActive: {
    borderColor: T.brandPurpleLight,
    backgroundColor: "rgba(124, 58, 237, 0.14)",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 0 10px rgba(124, 58, 237, 0.35)" }
      : {
          shadowColor: T.brandPurple,
          shadowOpacity: 0.35,
          shadowRadius: 10,
        }),
  },
  cardAvatar: { fontSize: 24, marginBottom: 6 },
  cardName: { color: T.text, fontSize: 13, fontWeight: "800", marginBottom: 4 },
  cardMission: { color: T.muted, fontSize: 11, lineHeight: 15 },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg,
    padding: 16,
    gap: 8,
  },
  emptyTitle: { color: T.text, fontSize: 14, fontWeight: "800", textAlign: "center" },
  empty: { color: T.muted, fontSize: 13, lineHeight: 18, textAlign: "center" },
});
