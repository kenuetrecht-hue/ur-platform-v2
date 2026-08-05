import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { brandGradientPair, brandSoftGradientPair, withAlpha } from "@/lib/brand-theme";
import type { ComponentProps } from "react";

export type SocialHubTab = "feed" | "friends" | "mail" | "creators" | "activity";

type TabDef = {
  id: SocialHubTab;
  label: string;
  icon: ComponentProps<typeof IconSymbol>["name"];
};

const TABS: TabDef[] = [
  { id: "feed", label: "Feed", icon: "sparkles" },
  { id: "friends", label: "Friends", icon: "person.2.fill" },
  { id: "mail", label: "Mail", icon: "envelope.fill" },
  { id: "creators", label: "Creators", icon: "star.fill" },
  { id: "activity", label: "Activity", icon: "chart.bar.fill" },
];

type Props = {
  active: SocialHubTab;
  onChange: (tab: SocialHubTab) => void;
  messageBadge?: number;
  pendingFriends?: number;
};

export function SocialHubTabBar({
  active,
  onChange,
  messageBadge = 0,
  pendingFriends = 0,
}: Props) {
  const colors = useColors();
  const [gradStart, gradEnd] = brandGradientPair(colors);
  const softGrad = brandSoftGradientPair(colors);

  const badgeFor = (id: SocialHubTab) => {
    if (id === "mail" && messageBadge > 0) return messageBadge;
    if (id === "friends" && pendingFriends > 0) return pendingFriends;
    return 0;
  };

  return (
    <LinearGradient
      colors={softGrad}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.wrap, { borderBottomColor: withAlpha(colors.secondary, 0.18) }]}
    >
      <View style={styles.row}>
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const badge = badgeFor(tab.id);

          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              style={({ pressed }) => [
                styles.tab,
                pressed && !isActive ? { opacity: 0.75 } : null,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
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
  tab: TabDef;
  active: boolean;
  badge: number;
  colors: ReturnType<typeof useColors>;
}) {
  const iconColor = active ? "#FFFFFF" : colors.primary;
  const labelColor = active ? "#FFFFFF" : colors.foreground;

  return (
    <>
      <View style={styles.iconWrap}>
        <IconSymbol name={tab.icon} size={18} color={iconColor} />
        {badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: active ? "#FFFFFF" : colors.secondary }]}>
            <Text
              style={[
                styles.badgeText,
                { color: active ? colors.primary : "#FFFFFF" },
              ]}
            >
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
