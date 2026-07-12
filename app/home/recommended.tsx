import React from "react";
import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function RecommendedScreen() {
  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Recommended</Text>
          <Text className="text-base text-muted mb-6">Personalized recommendations for you</Text>
          <View className="bg-surface rounded-lg p-6 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-2">Personalized Content</Text>
            <Text className="text-sm text-muted">Content tailored to your interests will appear here</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
