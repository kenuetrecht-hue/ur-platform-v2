import { useEffect, useRef } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import type { AiHubCategoryGroup } from "@/lib/ai-hub-navigation";

type Props = {
  groups: AiHubCategoryGroup[];
  activeId: string;
  onSelect: (groupId: string) => void;
};

const MOUNT_ID = "landing-category-tabs-mount";

function NativeCategoryTabs({ groups, activeId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      contentContainerStyle={styles.tabRow}
    >
      {groups.map((group) => {
        const active = group.id === activeId;
        return (
          <Pressable
            key={group.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(group.id)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={styles.tabEmoji}>{group.emoji}</Text>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{group.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function WebCategoryTabs({ groups, activeId, onSelect }: Props) {
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (typeof document === "undefined") return;

    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    mount.replaceChildren();

    for (const group of groups) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.groupId = group.id;
      button.setAttribute("aria-pressed", group.id === activeId ? "true" : "false");
      button.style.display = "flex";
      button.style.flexDirection = "column";
      button.style.alignItems = "center";
      button.style.justifyContent = "center";
      button.style.minWidth = "76px";
      button.style.minHeight = "68px";
      button.style.borderRadius = "14px";
      button.style.border = "1px solid";
      button.style.padding = "8px 10px";
      button.style.gap = "4px";
      button.style.fontFamily = "inherit";
      button.style.cursor = "pointer";
      button.style.flexShrink = "0";

      const active = group.id === activeId;
      button.style.borderColor = active ? T.brandBlueLight : T.border;
      button.style.backgroundColor = active ? "rgba(79, 70, 229, 0.22)" : T.bg;
      button.style.color = active ? T.text : T.muted;

      const emoji = document.createElement("span");
      emoji.textContent = group.emoji;
      emoji.style.fontSize = "20px";
      emoji.style.lineHeight = "24px";

      const label = document.createElement("span");
      label.textContent = group.label;
      label.style.fontSize = "11px";
      label.style.fontWeight = "700";
      label.style.textAlign = "center";
      label.style.color = active ? T.text : T.muted;

      button.append(emoji, label);

      const handleClick = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const id = button.dataset.groupId;
        if (!id || !groups.some((g) => g.id === id)) return;
        onSelectRef.current(id);
      };

      button.addEventListener("click", handleClick);
      mount.appendChild(button);
    }

    return () => {
      mount.replaceChildren();
    };
  }, [groups, activeId]);

  return (
    <View style={styles.webScrollWrap}>
      <View nativeID={MOUNT_ID} collapsable={false} style={styles.webTabRow} />
    </View>
  );
}

export function LandingCategoryTabRow(props: Props) {
  if (Platform.OS === "web") {
    return <WebCategoryTabs {...props} />;
  }
  return <NativeCategoryTabs {...props} />;
}

const styles = StyleSheet.create({
  tabRow: { gap: 8, paddingBottom: 14 },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  tabActive: {
    borderColor: T.brandBlueLight,
    backgroundColor: "rgba(79, 70, 229, 0.22)",
  },
  tabEmoji: { fontSize: 20, lineHeight: 24 },
  tabLabel: { color: T.muted, fontSize: 11, fontWeight: "700", textAlign: "center" },
  tabLabelActive: { color: T.text },
  webScrollWrap: {
    width: "100%",
    overflowX: "auto",
    marginBottom: 14,
  },
  webTabRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 2,
  },
});
