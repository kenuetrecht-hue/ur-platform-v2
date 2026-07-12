import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { router } from "expo-router";
import { ALL_AI_CREATORS } from "@/lib/ai-creators-system";

/**
 * AI Specialists Marketplace
 * 
 * Displays all 24 AI creators from the backend system.
 * Users can browse, search, and access individual AI specialists.
 */

export default function AISpecialistsScreen() {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter AIs based on search query
  const filteredAIs = ALL_AI_CREATORS.filter(
    (ai) =>
      ai.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ai.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ai.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ai.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectAI = (creatorId: string) => {
    router.push(`/creator/${creatorId}`);
  };

  const renderAICard = ({ item }: { item: typeof ALL_AI_CREATORS[0] }) => (
    <TouchableOpacity
      onPress={() => handleSelectAI(item.id)}
      className="bg-surface rounded-2xl p-4 mb-3 border border-border active:opacity-70"
    >
      <View className="flex-row items-start gap-3">
        {/* Avatar */}
        <View
          className="w-16 h-16 rounded-full items-center justify-center"
          style={{ backgroundColor: item.category === "wellness" ? "#10b981" : "#6366f1" }}
        >
          <Text className="text-2xl">{item.avatar}</Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground flex-1">{item.name}</Text>
            <View className="bg-primary px-2 py-1 rounded-full">
              <Text className="text-xs font-semibold text-white capitalize">{item.tier}</Text>
            </View>
          </View>

          <Text className="text-sm text-muted mt-1">{item.category}</Text>
          <Text className="text-xs text-muted mt-1 line-clamp-2">{item.bio}</Text>

          {/* Stats */}
          <View className="flex-row gap-4 mt-2">
            <View>
              <Text className="text-xs text-muted">Rating</Text>
              <Text className="text-sm font-semibold text-foreground">⭐ {item.rating.toFixed(1)}</Text>
            </View>
            <View>
              <Text className="text-xs text-muted">Followers</Text>
              <Text className="text-sm font-semibold text-foreground">{(item.followers / 1000).toFixed(0)}K</Text>
            </View>
            <View>
              <Text className="text-xs text-muted">Price</Text>
              <Text className="text-sm font-semibold text-primary">${item.price.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="p-4">
      <View className="mb-4">
        <Text className="text-3xl font-bold text-foreground mb-2">AI Specialists</Text>
        <Text className="text-sm text-muted">Browse all {ALL_AI_CREATORS.length} AI creators</Text>
      </View>

      {/* Search Bar */}
      <View className="mb-4">
        <TextInput
          placeholder="Search by name, category, or skill..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
        />
      </View>

      {/* Results Count */}
      <Text className="text-sm text-muted mb-3">
        {filteredAIs.length} of {ALL_AI_CREATORS.length} creators
      </Text>

      {/* AI List */}
      {filteredAIs.length > 0 ? (
        <FlatList
          data={filteredAIs}
          renderItem={renderAICard}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <View className="items-center justify-center py-12">
          <Text className="text-lg text-muted">No AI creators found</Text>
          <Text className="text-sm text-muted mt-2">Try a different search term</Text>
        </View>
      )}
    </ScreenContainer>
  );
}
