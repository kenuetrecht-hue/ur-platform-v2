/**
 * Page Header Component
 * Reusable header for all feature pages with back button and breadcrumb
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
  category?: "screen" | "ai_agent" | "system" | "safety";
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export function PageHeader({
  icon,
  title,
  subtitle,
  category,
  showBackButton = true,
  onBackPress,
}: PageHeaderProps) {
  const colors = useColors();
  const router = useRouter();

  const categoryColors = {
    screen: "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100",
    ai_agent: "bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100",
    system: "bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100",
    safety: "bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100",
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View className="mb-6">
      {/* Back Button & Title Row */}
      <View className="flex-row items-center justify-between mb-3">
        {showBackButton && (
          <Pressable
            onPress={handleBackPress}
            className="flex-row items-center gap-2 p-2 -ml-2 active:opacity-70"
          >
            <Text className="text-2xl">←</Text>
            <Text className="text-sm text-muted">Back</Text>
          </Pressable>
        )}
        <View className="flex-1" />
      </View>

      {/* Icon & Title */}
      <View className="flex-row items-start gap-3 mb-2">
        <Text className="text-4xl">{icon}</Text>
        <View className="flex-1">
          <Text className="text-3xl font-bold text-foreground">{title}</Text>
          {subtitle && <Text className="text-base text-muted mt-1">{subtitle}</Text>}
        </View>
      </View>

      {/* Category Badge */}
      {category && (
        <View className="mt-3">
          <View
            className={cn(
              "inline-flex px-3 py-1 rounded-full w-fit",
              categoryColors[category]
            )}
          >
            <Text className="text-xs font-semibold capitalize">
              {category.replace(/_/g, " ")}
            </Text>
          </View>
        </View>
      )}

      {/* Divider */}
      <View
        className="mt-4 h-0.5 bg-border"
        style={{ backgroundColor: colors.border }}
      />
    </View>
  );
}

export default PageHeader;
