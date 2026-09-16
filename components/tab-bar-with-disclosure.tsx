import { useContext, useEffect } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomTabBar,
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { PlatformDisclosureBar } from "@/components/platform-disclosure-bar";
import { useColors } from "@/hooks/use-colors";
import { withAlpha } from "@/lib/brand-theme";
import {
  LAYOUT_OVERLAP,
  bottomDisclaimerAboveTabHeight,
  tabBarIconsOnlyHeight,
} from "@/lib/layout-overlap";

/**
 * One tab bar. Native uses the phone safe-area inset. Web uses a fixed pad
 * so Home / Admin / AIs / Profile / Social labels stay fully visible.
 */
export function TabBarWithDisclosure(props: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const iconRowHeight = tabBarIconsOnlyHeight();
  const bottomPad =
    Platform.OS === "web" ? LAYOUT_OVERLAP.WEB_TAB_BAR_BOTTOM_PAD : insets.bottom;
  const estimatedHeight = bottomDisclaimerAboveTabHeight() + iconRowHeight + bottomPad;

  useEffect(() => {
    onHeightChange?.(estimatedHeight);
  }, [estimatedHeight, onHeightChange]);

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.surface,
          borderTopColor: withAlpha(colors.secondary, 0.28),
          paddingBottom: bottomPad,
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
    overflow: "visible",
    position: "relative",
  },
});
