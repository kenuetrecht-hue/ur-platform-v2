import { Redirect, Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { UrBootShell } from "@/components/ur-boot-shell";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { useColors } from "@/hooks/use-colors";
import { HapticTab } from "@/components/haptic-tab";
import { TabBarIcon } from "@/components/tab-bar-icon";
import { TabBarWithDisclosure } from "@/components/tab-bar-with-disclosure";
import { LAYOUT_OVERLAP, tabBarIconRowHeight } from "@/lib/layout-overlap";

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { canAccessAdminDashboard } = usePlatformOwner();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, LAYOUT_OVERLAP.TAB_BAR_MIN_BOTTOM_INSET);

  if (isLoading && !isAuthenticated) {
    return <UrBootShell label="Opening UR…" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.shell}>
      <Tabs
        tabBar={(props) => <TabBarWithDisclosure {...props} />}
        safeAreaInsets={{ top: 0, right: 0, bottom: 0, left: 0 }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          sceneStyle: {
            backgroundColor: colors.background,
            overflow: "hidden",
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 0,
            height: tabBarIconRowHeight(insets.bottom),
            paddingBottom: bottomInset,
            paddingTop: LAYOUT_OVERLAP.TAB_BAR_TOP_PADDING,
            elevation: 0,
            shadowOpacity: 0,
            position: "relative",
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 0.2,
          },
          tabBarButton: HapticTab,
        }}
      >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="house.fill" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: "/home",
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: canAccessAdminDashboard ? "/(tabs)/admin" : null,
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="shield.fill" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ais"
        options={{
          title: "AIs",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="sparkles" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="person.fill" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Social",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="bubble.right.fill" focused={focused} />
          ),
        }}
      />
      {/* Legacy routes — still reachable via Home quick actions, hidden from tab bar */}
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="discover" options={{ href: null }} />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
  },
});
