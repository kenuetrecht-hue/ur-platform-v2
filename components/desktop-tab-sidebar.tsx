import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/app-pressable";
import { PlatformDisclosureBar } from "@/components/platform-disclosure-bar";
import { useColors } from "@/hooks/use-colors";
import { withAlpha } from "@/lib/brand-theme";
import { DASHBOARD_SIDEBAR_WIDTH } from "@/lib/dashboard-layout";

/** Fixed left rail for wide web. Same destinations as the phone tab bar. */
export function DesktopTabSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((route) => descriptors[route.key]?.options.href !== null);

  return (
    <View
      {...(Platform.OS === "web" ? { className: "ur-desktop-sidebar" } : null)}
      testID="desktop-tab-sidebar"
      style={[
        styles.rail,
        {
          width: DASHBOARD_SIDEBAR_WIDTH,
          paddingTop: Math.max(insets.top, 12),
          backgroundColor: withAlpha("#1e1b4b", 0.9),
          borderRightColor: withAlpha(colors.gold, 0.35),
        },
      ]}
    >
      <Text style={[styles.brand, { color: colors.gold }]}>UR</Text>
      <ScrollView
        {...(Platform.OS === "web" ? { className: "ur-desktop-nav" } : null)}
        style={styles.navScroll}
        contentContainerStyle={styles.nav}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {routes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index]?.key === route.key;
          const tint = focused ? colors.gold : withAlpha(colors.gold, 0.72);
          const label = options.title ?? route.name;
          const icon = options.tabBarIcon?.({ focused, color: tint, size: 20 });

          return (
            <AppPressable
              key={route.key}
              testID={`desktop-tab-${route.name}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={[
                styles.item,
                focused
                  ? { backgroundColor: withAlpha(colors.gold, 0.16), borderColor: withAlpha(colors.gold, 0.55) }
                  : { borderColor: "transparent" },
              ]}
            >
              {icon}
              <Text pointerEvents="none" style={[styles.label, { color: tint }]} numberOfLines={1}>
                {label}
              </Text>
            </AppPressable>
          );
        })}
      </ScrollView>
      <PlatformDisclosureBar position="bottom" compact aboveTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: "column",
    flexShrink: 0,
    flexGrow: 0,
    alignSelf: "stretch",
    height: "100%",
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  navScroll: {
    flex: 1,
    minHeight: 0,
  },
  nav: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 10,
    paddingBottom: 12,
    gap: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
});
