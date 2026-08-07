import { View, StyleSheet } from "react-native";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlatformDisclosureBar } from "@/components/platform-disclosure-bar";
import { useColors } from "@/hooks/use-colors";
import { withAlpha } from "@/lib/brand-theme";

/**
 * Global bottom chrome for all tab screens — legal disclaimer stacked above tab icons.
 * Registered once in app/(tabs)/_layout.tsx via the tabBar prop.
 */
export function TabBarWithDisclosure(props: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.surface,
          borderTopColor: withAlpha(colors.secondary, 0.2),
          paddingBottom: insets.bottom > 0 ? 0 : undefined,
        },
      ]}
      collapsable={false}
    >
      <PlatformDisclosureBar position="bottom" compact aboveTabBar />
      <View style={styles.tabBarSlot}>
        <BottomTabBar {...props} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBarSlot: {
    flexShrink: 0,
  },
});
