import React from "react";
import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function TrendingScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Trending Now</Text>
          <Text className="text-base text-muted mb-6">Most popular content right now</Text>
          
          <View className="bg-surface rounded-lg p-6 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-2">Trending Content</Text>
            <Text className="text-sm text-muted">Top trending videos, audio, and content will appear here</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
