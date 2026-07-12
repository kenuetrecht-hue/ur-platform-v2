/**
 * Demo Section Component
 * Reusable section for displaying feature demos and information
 */

import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

export interface DemoSectionProps {
  title: string;
  description?: string;
  icon?: string;
  children?: React.ReactNode;
  variant?: "default" | "info" | "success" | "warning" | "error";
}

export function DemoSection({
  title,
  description,
  icon,
  children,
  variant = "default",
}: DemoSectionProps) {
  const colors = useColors();

  const variantStyles = {
    default: "bg-surface border-border",
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  };

  const titleStyles = {
    default: "text-foreground",
    info: "text-blue-900 dark:text-blue-100",
    success: "text-green-900 dark:text-green-100",
    warning: "text-yellow-900 dark:text-yellow-100",
    error: "text-red-900 dark:text-red-100",
  };

  const descriptionStyles = {
    default: "text-muted",
    info: "text-blue-800 dark:text-blue-200",
    success: "text-green-800 dark:text-green-200",
    warning: "text-yellow-800 dark:text-yellow-200",
    error: "text-red-800 dark:text-red-200",
  };

  return (
    <View className={cn("rounded-lg p-4 mb-4 border-2", variantStyles[variant])}>
      {/* Header */}
      <View className="flex-row items-center gap-2 mb-2">
        {icon && <Text className="text-2xl">{icon}</Text>}
        <Text className={cn("text-lg font-bold", titleStyles[variant])}>{title}</Text>
      </View>

      {/* Description */}
      {description && (
        <Text className={cn("text-sm mb-3 leading-relaxed", descriptionStyles[variant])}>
          {description}
        </Text>
      )}

      {/* Content */}
      {children && <View className="mt-2">{children}</View>}
    </View>
  );
}

export function DemoButton({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
}) {
  const colors = useColors();

  const variantStyles = {
    primary: "bg-primary active:opacity-80",
    secondary: "bg-surface border-2 border-border active:opacity-70",
    danger: "bg-red-500 active:opacity-80",
  };

  const textStyles = {
    primary: "text-white",
    secondary: "text-foreground",
    danger: "text-white",
  };

  return (
    <Pressable
      onPress={onPress}
      className={cn("rounded-lg p-3 mb-2", variantStyles[variant])}
    >
      <Text className={cn("font-semibold text-center", textStyles[variant])}>{label}</Text>
    </Pressable>
  );
}

export function DemoFeatureList({ features }: { features: string[] }) {
  return (
    <View className="mb-3">
      {features.map((feature, index) => (
        <View key={index} className="flex-row items-center gap-2 mb-2">
          <Text className="text-primary text-lg">✓</Text>
          <Text className="text-foreground flex-1">{feature}</Text>
        </View>
      ))}
    </View>
  );
}

export function DemoStats({
  stats,
}: {
  stats: { label: string; value: string | number; icon?: string }[];
}) {
  return (
    <View className="flex-row gap-2 mb-4">
      {stats.map((stat, index) => (
        <View key={index} className="flex-1 bg-foreground/5 rounded-lg p-3">
          {stat.icon && <Text className="text-2xl mb-1">{stat.icon}</Text>}
          <Text className="text-2xl font-bold text-foreground">{stat.value}</Text>
          <Text className="text-xs text-muted">{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default DemoSection;
