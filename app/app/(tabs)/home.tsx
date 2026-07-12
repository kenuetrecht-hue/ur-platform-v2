import React from "react";
import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function HomeScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Home</Text>
          <Text className="text-base text-muted mb-6">
            Welcome to your home feed
          </Text>
          
          <View className="bg-surface rounded-lg p-6 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-2">
              Home Feed
            </Text>
            <Text className="text-sm text-muted">
              Your personalized content feed will appear here
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
