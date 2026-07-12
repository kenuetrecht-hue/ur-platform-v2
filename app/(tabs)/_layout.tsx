import React, { useState, useEffect } from "react";
import { View, useWindowDimensions, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConsolidatedTabBar } from "@/components/consolidated-tab-bar";
import { useColors } from "@/hooks/use-colors";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("home");
  const [isCreator, setIsCreator] = useState(false);

  // Responsive breakpoint: 768px (md) for desktop sidebar layout
  const isDesktop = Platform.OS === "web" && width >= 768;

  useEffect(() => {
    // Check if user is creator - in real app, this would come from auth context
    // For now, we'll assume the first creator is always logged in
    setIsCreator(true);
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Navigate to the appropriate screen based on tab
    const route = consolidatedNavigation.getRouteForTab(tabId);
    if (route) {
      router.push(route as any);
    }
  };

  const handleSubMenuSelect = (tabId: string, subMenuId: string) => {
    // Handle sub-menu selection
    // Navigate to the appropriate sub-screen
    const route = consolidatedNavigation.getRouteForSubMenu(tabId, subMenuId);
    if (route) {
      router.push(route as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Main Content Stack */}
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />

      {/* Consolidated Tab Bar */}
      {!isDesktop && (
        <ConsolidatedTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSubMenuSelect={handleSubMenuSelect}
        />
      )}

      {/* Desktop Sidebar Navigation */}
      {isDesktop && (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 80,
            height: "100%",
            backgroundColor: colors.background,
            borderRightColor: colors.border,
            borderRightWidth: 1,
            paddingTop: 16,
            paddingBottom: 16,
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          {/* Desktop navigation will be implemented separately */}
        </View>
      )}
    </View>
  );
}
