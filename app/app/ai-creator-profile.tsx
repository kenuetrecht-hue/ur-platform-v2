import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, FlatList } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { WarningBanner } from "@/components/warning-banner";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import {
  ALL_AI_CREATORS,
  generateAIContent,
  AIContent,
  getAICreatorById,
} from "@/lib/ai-creators-system";

export default function AICreatorProfileScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [contents, setContents] = useState<AIContent[]>([]);
  const [loading, setLoading] = useState(true);

  const creator = getAICreatorById(id || "");

  useEffect(() => {
    if (creator) {
      // Simulate loading content
      setTimeout(() => {
        const newContents = Array.from({ length: 5 }, () =>
          generateAIContent(creator)
        );
        setContents(newContents);
        setLoading(false);
      }, 1000);
    }
  }, [creator]);

  if (!creator) {
    return (
      <ScreenContainer>
        <WarningBanner />
        <View className="flex-1 items-center justify-center">
          <Text className="text-foreground">Creator not found</Text>
        </View>
      </ScreenContainer>
    );
  }

  const handleSubscribe = () => {
    setIsSubscribed(!isSubscribed);
  };

  return (
    <ScreenContainer>
      <WarningBanner />
      <FlatList
        data={contents}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="gap-4 pb-4">
            {/* Creator Header */}
            <View className="items-center gap-3 py-6 bg-surface rounded-lg px-4">
              <Text className="text-6xl">{creator.avatar}</Text>
              <View className="items-center gap-1">
                <Text className="text-2xl font-bold text-foreground">
                  {creator.name}
                </Text>
                <Text className="text-sm text-muted">{creator.handle}</Text>
              </View>
              <Text className="text-sm text-center text-muted max-w-xs">
                {creator.bio}
              </Text>
            </View>

            {/* Stats */}
            <View className="flex-row gap-3">
              <View className="flex-1 bg-surface rounded-lg p-3 items-center">
                <Text className="text-lg font-bold text-foreground">
                  {(creator.followers / 1000).toFixed(0)}K
                </Text>
                <Text className="text-xs text-muted">Followers</Text>
              </View>
              <View className="flex-1 bg-surface rounded-lg p-3 items-center">
                <Text className="text-lg font-bold text-foreground">
                  {creator.rating}
                </Text>
                <Text className="text-xs text-muted">Rating</Text>
              </View>
              <View className="flex-1 bg-surface rounded-lg p-3 items-center">
                <Text className="text-lg font-bold text-primary">
                  ${creator.price}
                </Text>
                <Text className="text-xs text-muted">/month</Text>
              </View>
            </View>

            {/* Subscribe Button */}
            <Pressable
              onPress={handleSubscribe}
              className={cn(
                "rounded-lg py-4 items-center",
                isSubscribed ? "bg-surface border border-primary" : "bg-primary"
              )}
            >
              <Text
                className={cn(
                  "font-bold text-lg",
                  isSubscribed ? "text-primary" : "text-white"
                )}
              >
                {isSubscribed ? "✓ Subscribed" : `Subscribe - $${creator.price}/mo`}
              </Text>
            </Pressable>

            {/* Creator Info */}
            <View className="gap-3">
              <View className="bg-surface rounded-lg p-4 gap-2">
                <Text className="text-sm font-bold text-foreground">
                  Category
                </Text>
                <Text className="text-sm text-muted">{creator.category}</Text>
              </View>

              <View className="bg-surface rounded-lg p-4 gap-2">
                <Text className="text-sm font-bold text-foreground">
                  Update Frequency
                </Text>
                <Text className="text-sm text-muted">
                  {creator.updateFrequency}
                </Text>
              </View>

              <View className="bg-surface rounded-lg p-4 gap-2">
                <Text className="text-sm font-bold text-foreground">
                  Data Source
                </Text>
                <Text className="text-sm text-muted">{creator.dataSource}</Text>
              </View>

              <View className="bg-surface rounded-lg p-4 gap-2">
                <Text className="text-sm font-bold text-foreground">
                  Topics
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {creator.topics.map((topic) => (
                    <View
                      key={topic}
                      className="bg-primary/20 rounded-full px-3 py-1"
                    >
                      <Text className="text-xs font-semibold text-primary">
                        {topic}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Disclaimer */}
            <View className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 gap-2">
              <Text className="text-sm font-bold text-foreground">
                ⚠️ Important Notice
              </Text>
              <Text className="text-xs text-muted">{creator.disclaimer}</Text>
            </View>

            {/* Content Header */}
            <View className="pt-4">
              <Text className="text-lg font-bold text-foreground">
                Latest Content
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-surface rounded-lg p-4 mb-3 gap-3 border border-border">
            <View className="gap-1">
              <Text className="text-sm font-bold text-foreground">
                {item.title}
              </Text>
              <Text className="text-xs text-muted">
                {new Date(item.timestamp).toLocaleDateString()}
              </Text>
            </View>

            <Text className="text-sm text-foreground leading-relaxed">
              {item.content.substring(0, 300)}...
            </Text>

            <View className="flex-row gap-2 items-center justify-between">
              <View className="flex-row gap-3">
                <View className="flex-row items-center gap-1">
                  <Text className="text-lg">👁️</Text>
                  <Text className="text-xs text-muted">
                    {(item.engagement.views / 1000).toFixed(0)}K
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-lg">❤️</Text>
                  <Text className="text-xs text-muted">
                    {(item.engagement.likes / 1000).toFixed(1)}K
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-lg">↗️</Text>
                  <Text className="text-xs text-muted">
                    {(item.engagement.shares / 100).toFixed(0)}
                  </Text>
                </View>
              </View>

              <View className="bg-primary/20 rounded-full px-2 py-1">
                <Text className="text-xs font-bold text-primary">
                  {Math.round(item.confidence * 100)}%
                </Text>
              </View>
            </View>

            <Pressable className="bg-primary/10 rounded-lg py-2 items-center">
              <Text className="text-sm font-semibold text-primary">
                Read Full Content
              </Text>
            </Pressable>
          </View>
        )}
        scrollEnabled={true}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
      />
    </ScreenContainer>
  );
}
