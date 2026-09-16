import { useContext, useEffect } from "react";
import { Platform, View, StyleSheet } from "react-native";
import {
  BottomTabBar,
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { PlatformDisclosureBar } from "@/components/platform-disclosure-bar";
import { useColors } from "@/hooks/use-colors";
import { useTabBarBottomInset } from "@/hooks/use-tab-bar-bottom-inset";
import { withAlpha } from "@/lib/brand-theme";
import { bottomDisclaimerAboveTabHeight, tabBarIconsOnlyHeight } from "@/lib/layout-overlap";

/**
 * One tab bar. Icons and labels sit in this bar. Empty padding under the labels
 * is the phone home-indicator inset — not a second OS toolbar.
 */
export function TabBarWithDisclosure(props: BottomTabBarProps) {
  const colors = useColors();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const iconRowHeight = tabBarIconsOnlyHeight();
  const homePad = useTabBarBottomInset();
  const estimatedHeight = bottomDisclaimerAboveTabHeight() + iconRowHeight + homePad;

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
          paddingBottom: homePad,
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
    position: "relative",
  },
  tabBarSlot: {
    flexShrink: 0,
    overflow: "hidden",
    position: "relative",
  },
});
