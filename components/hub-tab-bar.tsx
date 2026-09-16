import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { brandGradientPair, brandSoftGradientPair, withAlpha } from "@/lib/brand-theme";
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

/** Same clean Social-style pills — dark bar, blue-to-purple active tab. */
export function HubTabBar({ tabs, activeId, onSelect, badgeFor }: Props) {
  const colors = useColors();
  const [gradStart, gradEnd] = brandGradientPair(colors);
  const softGrad = brandSoftGradientPair(colors);

  return (
    <LinearGradient
      colors={softGrad}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.wrap, { borderBottomColor: withAlpha(colors.secondary, 0.18) }]}
    >
      <View style={styles.row}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const badge = badgeFor?.(tab.id) ?? 0;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onSelect(tab.id)}
              style={({ pressed }) => [styles.tab, pressed && !isActive ? { opacity: 0.75 } : null]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              testID={`hub-tab-${tab.id}`}
            >
              {isActive ? (
                <LinearGradient
                  colors={[gradStart, gradEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activePill}
                >
                  <TabInner tab={tab} active badge={badge} colors={colors} />
                </LinearGradient>
              ) : (
                <View style={styles.inactivePill}>
                  <TabInner tab={tab} active={false} badge={badge} colors={colors} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </LinearGradient>
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
  const iconColor = active ? "#FFFFFF" : colors.primary;
  const labelColor = active ? "#FFFFFF" : colors.foreground;

  return (
    <>
      <View style={styles.iconWrap}>
        {tab.emoji ? (
          <Text style={{ fontSize: 16, lineHeight: 20 }}>{tab.emoji}</Text>
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
        style={[styles.label, { color: labelColor, fontWeight: active ? "700" : "600" }]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 4,
  },
  tab: {
    flex: 1,
    minWidth: 0,
  },
  activePill: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    gap: 3,
  },
  inactivePill: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    gap: 3,
  },
  iconWrap: {
    position: "relative",
    width: 22,
    height: 22,
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
    fontSize: 9,
    letterSpacing: 0.1,
    textAlign: "center",
  },
});
