import { useState } from "react";
import { View, Text, ScrollView, Pressable, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { WarningBanner } from "@/components/warning-banner";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import { ALL_AI_CREATORS } from "@/lib/ai-creators-system";

export default function AICreatorsDirectoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(
    new Set(ALL_AI_CREATORS.map((c) => c.category))
  );

  const filteredCreators = selectedCategory
    ? ALL_AI_CREATORS.filter((c) => c.category === selectedCategory)
    : ALL_AI_CREATORS;

  const handleCreatorPress = (creatorId: string) => {
    router.push(`/ai-creator-profile?id=${creatorId}`);
  };

  return (
    <ScreenContainer>
      <WarningBanner />
      <FlatList
        data={filteredCreators}
        keyExtractor={(item) => item.id}
        numColumns={1}
        ListHeaderComponent={
          <View className="gap-4 pb-4">
            {/* Header */}
            <View className="gap-2">
              <Text className="text-3xl font-bold text-foreground">
                AI Creators
              </Text>
              <Text className="text-base text-muted">
                Explore AI-powered creators delivering real-time insights
              </Text>
            </View>

            {/* Category Filter */}
            <View className="gap-2">
              <Text className="text-sm font-bold text-foreground">
                Categories
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="gap-2"
              >
                <Pressable
                  onPress={() => setSelectedCategory(null)}
                  className={cn(
                    "px-4 py-2 rounded-full",
                    selectedCategory === null
                      ? "bg-primary"
                      : "bg-surface border border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-semibold",
                      selectedCategory === null
                        ? "text-white"
                        : "text-foreground"
                    )}
                  >
                    All
                  </Text>
                </Pressable>

                {categories.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    className={cn(
                      "px-4 py-2 rounded-full",
                      selectedCategory === category
                        ? "bg-primary"
                        : "bg-surface border border-border"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-semibold",
                        selectedCategory === category
                          ? "text-white"
                          : "text-foreground"
                      )}
                    >
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Info Banner */}
            <View className="bg-blue-500/10 border border-blue-500 rounded-lg p-4 gap-2">
              <Text className="text-sm font-bold text-foreground">
                💡 About AI Creators
              </Text>
              <Text className="text-xs text-muted">
                All content is AI-generated for entertainment and educational purposes only. Each creator pulls real data and communicates like a human expert in their field.
              </Text>
            </View>
          </View>
        }
        renderItem={({ item: creator }) => (
          <Pressable
            onPress={() => handleCreatorPress(creator.id)}
            className="bg-surface rounded-lg border border-border p-4 mb-3 gap-3 active:opacity-70"
          >
            {/* Creator Header */}
            <View className="flex-row items-start gap-3">
              <Text className="text-5xl">{creator.avatar}</Text>
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-bold text-foreground flex-1">
                    {creator.name}
                  </Text>
                  <View
                    className={cn(
                      "px-2 py-1 rounded-full",
                      creator.tier === "platinum"
                        ? "bg-purple-500/20"
                        : creator.tier === "gold"
                          ? "bg-yellow-500/20"
                          : "bg-gray-500/20"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-xs font-bold capitalize",
                        creator.tier === "platinum"
                          ? "text-purple-600"
                          : creator.tier === "gold"
                            ? "text-yellow-600"
                            : "text-gray-600"
                      )}
                    >
                      {creator.tier}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted">{creator.handle}</Text>
                <Text className="text-sm text-muted leading-relaxed">
                  {creator.bio.substring(0, 100)}...
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View className="flex-row gap-2">
              <View className="flex-1 bg-background rounded p-2 items-center">
                <Text className="text-xs font-bold text-foreground">
                  {(creator.followers / 1000).toFixed(0)}K
                </Text>
                <Text className="text-xs text-muted">Followers</Text>
              </View>
              <View className="flex-1 bg-background rounded p-2 items-center">
                <Text className="text-xs font-bold text-foreground">
                  {creator.rating}⭐
                </Text>
                <Text className="text-xs text-muted">Rating</Text>
              </View>
              <View className="flex-1 bg-background rounded p-2 items-center">
                <Text className="text-xs font-bold text-primary">
                  ${creator.price}
                </Text>
                <Text className="text-xs text-muted">/month</Text>
              </View>
              <View className="flex-1 bg-background rounded p-2 items-center">
                <Text className="text-xs font-bold text-foreground">
                  {creator.updateFrequency.split("(")[1]?.replace(")", "") || "Updates"}
                </Text>
                <Text className="text-xs text-muted">Updates</Text>
              </View>
            </View>

            {/* Topics */}
            <View className="flex-row flex-wrap gap-1">
              {creator.topics.slice(0, 3).map((topic) => (
                <View key={topic} className="bg-primary/20 rounded-full px-2 py-1">
                  <Text className="text-xs font-semibold text-primary">
                    {topic}
                  </Text>
                </View>
              ))}
              {creator.topics.length > 3 && (
                <View className="bg-border rounded-full px-2 py-1">
                  <Text className="text-xs font-semibold text-muted">
                    +{creator.topics.length - 3} more
                  </Text>
                </View>
              )}
            </View>

            {/* CTA */}
            <View className="flex-row gap-2 pt-2">
              <Pressable className="flex-1 bg-primary rounded-lg py-2 items-center">
                <Text className="text-white font-bold text-sm">Subscribe</Text>
              </Pressable>
              <Pressable className="flex-1 bg-surface border border-border rounded-lg py-2 items-center">
                <Text className="text-foreground font-bold text-sm">View</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
        scrollEnabled={true}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
      />
    </ScreenContainer>
  );
}
