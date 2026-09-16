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
import { bottomTabChromeHeight, tabBarIconsOnlyHeight } from "@/lib/layout-overlap";

/**
 * Global bottom chrome for all tab screens — legal disclaimer stacked above tab icons.
 * A blank strip under the labels keeps Home / Admin / AIs / Profile / Social
 * above the phone home bar and Safari toolbar.
 */
export function TabBarWithDisclosure(props: BottomTabBarProps) {
  const colors = useColors();
  const bottomInset = useTabBarBottomInset();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const iconRowHeight = tabBarIconsOnlyHeight();
  const dockHeight = bottomTabChromeHeight(bottomInset);

  useEffect(() => {
    onHeightChange?.(dockHeight);
  }, [dockHeight, onHeightChange]);

  return (
    <View
      style={[
        styles.wrapper,
        {
          minHeight: dockHeight,
          backgroundColor: colors.surface,
          borderTopColor: withAlpha(colors.secondary, 0.28),
        },
      ]}
      collapsable={false}
      onLayout={(event) =>
        onHeightChange?.(Math.max(dockHeight, event.nativeEvent.layout.height))
      }
    >
      <PlatformDisclosureBar position="bottom" compact aboveTabBar />
      <View style={[styles.tabBarSlot, { height: iconRowHeight }]}>
        <BottomTabBarHeightCallbackContext.Provider value={() => undefined}>
          <BottomTabBar {...props} />
        </BottomTabBarHeightCallbackContext.Provider>
      </View>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={
          Platform.OS === "web"
            ? ({
                minHeight: bottomInset,
                height: `max(${bottomInset}px, env(safe-area-inset-bottom, 0px))`,
                flexShrink: 0,
              } as object)
            : { height: bottomInset, flexShrink: 0 }
        }
      />
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
    overflow: "hidden",
    position: "relative",
  },
});
