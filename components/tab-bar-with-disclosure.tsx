import { useContext, useEffect } from "react";
import { Platform, View, StyleSheet } from "react-native";
import {
  BottomTabBar,
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlatformDisclosureBar } from "@/components/platform-disclosure-bar";
import { useColors } from "@/hooks/use-colors";
import { withAlpha } from "@/lib/brand-theme";
import { bottomDisclaimerAboveTabHeight, tabBarIconsOnlyHeight } from "@/lib/layout-overlap";

/**
 * One tab bar. Labels sit in this bar. Bottom padding is the phone home-indicator
 * inset inside the same bar — not a second toolbar.
 */
export function TabBarWithDisclosure(props: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const iconRowHeight = tabBarIconsOnlyHeight();
  const nativePad = Platform.OS === "web" ? 0 : insets.bottom;
  const estimatedHeight = bottomDisclaimerAboveTabHeight() + iconRowHeight + nativePad;

  useEffect(() => {
    onHeightChange?.(estimatedHeight);
  }, [estimatedHeight, onHeightChange]);

  return (
    <View
      {...(Platform.OS === "web" ? { className: "ur-tab-dock" } : null)}
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.surface,
          borderTopColor: withAlpha(colors.secondary, 0.28),
          paddingBottom: nativePad,
        },
      ]}
      collapsable={false}
      onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
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
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBarSlot: {
    flexShrink: 0,
    overflow: "visible",
    position: "relative",
  },
});
