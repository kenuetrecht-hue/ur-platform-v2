import { useContext, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import {
  BottomTabBar,
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlatformDisclosureBar } from "@/components/platform-disclosure-bar";
import { useColors } from "@/hooks/use-colors";
import { withAlpha } from "@/lib/brand-theme";
import { bottomTabChromeHeight, tabBarIconRowHeight } from "@/lib/layout-overlap";

/**
 * Global bottom chrome for all tab screens — legal disclaimer stacked above tab icons.
 * Registered once in app/(tabs)/_layout.tsx via the tabBar prop.
 */
export function TabBarWithDisclosure(props: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const dockHeight = bottomTabChromeHeight(insets.bottom);
  const iconRowHeight = tabBarIconRowHeight(insets.bottom);

  useEffect(() => {
    onHeightChange?.(dockHeight);
  }, [dockHeight, onHeightChange]);

  return (
    <View
      style={[
        styles.wrapper,
        {
          height: dockHeight,
          backgroundColor: colors.surface,
          borderTopColor: withAlpha(colors.secondary, 0.28),
        },
      ]}
      collapsable={false}
      onLayout={() => onHeightChange?.(dockHeight)}
    >
      <PlatformDisclosureBar position="bottom" compact aboveTabBar />
      <View style={[styles.tabBarSlot, { height: iconRowHeight }]}>
        <BottomTabBarHeightCallbackContext.Provider value={() => undefined}>
          <BottomTabBar {...props} />
        </BottomTabBarHeightCallbackContext.Provider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexShrink: 0,
    width: "100%",
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBarSlot: {
    flexShrink: 0,
    overflow: "hidden",
    position: "relative",
  },
});
