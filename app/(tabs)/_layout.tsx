import { Redirect, Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { UrBootShell } from "@/components/ur-boot-shell";
import { useAuth } from "@/lib/auth-context";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { useColors } from "@/hooks/use-colors";
import { HapticTab } from "@/components/haptic-tab";
import { TabBarIcon } from "@/components/tab-bar-icon";
import { TabBarWithDisclosure } from "@/components/tab-bar-with-disclosure";
import { LAYOUT_OVERLAP, tabBarIconsOnlyHeight } from "@/lib/layout-overlap";

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isPlatformOwner } = usePlatformOwner();
  const colors = useColors();
  const iconRowHeight = tabBarIconsOnlyHeight();

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
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.onWhite,
          tabBarInactiveTintColor: colors.onWhite,
          sceneStyle: {
            backgroundColor: "transparent",
            overflow: "hidden",
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 0,
            height: iconRowHeight,
            paddingBottom: 0,
            paddingTop: LAYOUT_OVERLAP.TAB_BAR_TOP_PADDING,
            elevation: 0,
            shadowOpacity: 0,
            position: "relative",
          },
          tabBarLabelStyle: {
            fontSize: 8,
            fontWeight: "600",
            letterSpacing: 0.1,
            marginTop: 0,
            marginBottom: 0,
          },
          tabBarItemStyle: {
            height: iconRowHeight,
            paddingTop: 0,
            paddingBottom: 0,
          },
          tabBarIconStyle: {
            marginTop: 0,
            marginBottom: 0,
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
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isPlatformOwner ? "/(tabs)/admin" : null,
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
