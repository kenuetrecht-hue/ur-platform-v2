import React from "react";
import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function CreateVideoScreen() {
  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Create Video</Text>
          <Text className="text-base text-muted mb-6">Start creating a new video</Text>
          <View className="bg-surface rounded-lg p-6 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-2">Video Editor</Text>
            <Text className="text-sm text-muted">Upload, edit, and publish your video content</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
