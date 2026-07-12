import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";

export interface ConsolidatedTabBarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onSubMenuSelect?: (tabId: string, subMenuId: string) => void;
}

export function ConsolidatedTabBar({
  activeTab,
  onTabChange,
  onSubMenuSelect,
}: ConsolidatedTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expandedTab, setExpandedTab] = useState<string | null>(null);
  const [subMenuAnimation] = useState(new Animated.Value(0));

  const tabs = consolidatedNavigation.getAllTabs();
  const bottomPadding = Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  const handleTabPress = (tabId: string) => {
    if (expandedTab === tabId) {
      // Toggle sub-menu
      setExpandedTab(null);
      Animated.timing(subMenuAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      // Show sub-menu
      setExpandedTab(tabId);
      Animated.timing(subMenuAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }

    onTabChange(tabId);
  };

  const handleSubMenuPress = (tabId: string, subMenuId: string) => {
    if (onSubMenuSelect) {
      onSubMenuSelect(tabId, subMenuId);
    }
    setExpandedTab(null);
  };

  const getTabIcon = (tabId: string): string => {
    const iconMap: Record<string, string> = {
      home: "house.fill",
      create: "pencil.circle.fill",
      discover: "compass.fill",
      messages: "bubble.right.fill",
      profile: "person.fill",
    };
    return iconMap[tabId] || "square";
  };

  const getBadgeCount = (tabId: string): number | undefined => {
    const tab = consolidatedNavigation.getTab(tabId);
    return tab?.badge;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {/* Sub-Menu (when expanded) */}
      {expandedTab && (
        <Animated.View
          style={[
            styles.subMenuContainer,
            {
              opacity: subMenuAnimation,
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          ]}
        >
          {consolidatedNavigation.getSubMenu(expandedTab).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.subMenuItem}
              onPress={() => handleSubMenuPress(expandedTab, item.id)}
            >
              <Text
                style={[
                  styles.subMenuLabel,
                  {
                    color: colors.foreground,
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* Main Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const badge = getBadgeCount(tab.id);

          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                isActive && {
                  backgroundColor: `${colors.primary}15`,
                },
              ]}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <IconSymbol
                  name={getTabIcon(tab.id) as any}
                  size={28}
                  color={isActive ? colors.primary : colors.muted}
                />
                {badge && badge > 0 && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: colors.error,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color: colors.background,
                        },
                      ]}
                    >
                      {badge > 99 ? "99+" : badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive ? colors.primary : colors.muted,
                    fontWeight: isActive ? "600" : "400",
                  },
                ]}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 56,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  iconContainer: {
    position: "relative",
    marginBottom: 4,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  label: {
    fontSize: 10,
    textAlign: "center",
  },
  subMenuContainer: {
    borderTopWidth: 0.5,
    maxHeight: 200,
  },
  subMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  subMenuLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
