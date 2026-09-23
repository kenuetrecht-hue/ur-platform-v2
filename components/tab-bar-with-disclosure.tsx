import { useContext, useEffect } from "react";
import { Platform, View, StyleSheet } from "react-native";
import {
  BottomTabBar,
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { DesktopTabSidebar } from "@/components/desktop-tab-sidebar";
import { PlatformDisclosureBar } from "@/components/platform-disclosure-bar";
import { useColors } from "@/hooks/use-colors";
import { useTabBarBottomInset } from "@/hooks/use-tab-bar-bottom-inset";
import { useWideDashboard } from "@/hooks/use-wide-dashboard";
import { withAlpha } from "@/lib/brand-theme";
import {
  bottomDisclaimerAboveTabHeight,
  tabBarIconsOnlyHeight,
} from "@/lib/layout-overlap";

/**
 * One tab bar. A single OS-bar pad under the icons — no second empty block.
 */
export function TabBarWithDisclosure(props: BottomTabBarProps) {
  const wide = useWideDashboard();
  if (wide) {
    return <DesktopTabSidebar {...props} />;
  }

  return <PhoneTabBar {...props} />;
}

function PhoneTabBar(props: BottomTabBarProps) {
  const colors = useColors();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const iconRowHeight = tabBarIconsOnlyHeight();
  const bottomPad = useTabBarBottomInset();
  const estimatedHeight = bottomDisclaimerAboveTabHeight() + iconRowHeight + bottomPad;

  useEffect(() => {
    onHeightChange?.(estimatedHeight);
  }, [estimatedHeight, onHeightChange]);

  return (
    <View
      {...(Platform.OS === "web" ? { className: "ur-tab-bar-web" } : null)}
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
          <BottomTabBar {...props} insets={{ ...props.insets, bottom: 0 }} />
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
