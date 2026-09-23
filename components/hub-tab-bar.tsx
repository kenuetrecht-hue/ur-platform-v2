import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { withAlpha } from "@/lib/brand-theme";
import type { ComponentProps } from "react";

export type HubTabItem = {
  id: string;
  label: string;
  icon?: ComponentProps<typeof IconSymbol>["name"];
  emoji?: string;
};

type Props = {
  tabs: HubTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  badgeFor?: (id: string) => number;
};

/** Horizontal gold pills under the page header. Scrolls when the labels do not fit. */
export function HubTabBar({ tabs, activeId, onSelect, badgeFor }: Props) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const badge = badgeFor?.(tab.id) ?? 0;

        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelect(tab.id)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: isActive ? withAlpha(colors.gold, 0.22) : withAlpha("#ffffff", 0.08),
                borderColor: isActive ? colors.gold : withAlpha(colors.gold, 0.35),
              },
              pressed && !isActive ? { opacity: 0.75 } : null,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            testID={`hub-tab-${tab.id}`}
          >
            <TabInner tab={tab} active={isActive} badge={badge} colors={colors} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function TabInner({
  tab,
  active,
  badge,
  colors,
}: {
  tab: HubTabItem;
  active: boolean;
  badge: number;
  colors: ReturnType<typeof useColors>;
}) {
  const iconColor = active ? "#FFFFFF" : colors.gold;
  const labelColor = active ? "#FFFFFF" : colors.gold;

  return (
    <>
      <View style={styles.iconWrap}>
        {tab.emoji ? (
          <Text pointerEvents="none" style={{ fontSize: 13, lineHeight: 16 }}>
            {tab.emoji}
          </Text>
        ) : tab.icon ? (
          <IconSymbol name={tab.icon} size={18} color={iconColor} />
        ) : null}
        {badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: active ? "#FFFFFF" : colors.secondary }]}>
            <Text style={[styles.badgeText, { color: active ? colors.primary : "#FFFFFF" }]}>
              {badge > 9 ? "9+" : badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        pointerEvents="none"
        style={[styles.label, { color: labelColor, fontWeight: active ? "700" : "600" }]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 8,
  },
  pill: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  iconWrap: {
    position: "relative",
    width: 18,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
