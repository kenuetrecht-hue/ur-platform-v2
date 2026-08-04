import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { HapticTab } from "@/components/haptic-tab";
import { TabBarIcon } from "@/components/tab-bar-icon";

const TAB_BAR_CONTENT_HEIGHT = 56;

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="house.fill" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="pencil.circle.fill" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="compass.fill" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="bubble.right.fill" focused={focused} />
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
    </Tabs>
  );
}
