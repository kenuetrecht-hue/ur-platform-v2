import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { creatorContentService, CreatorProfile } from "@/lib/creator-content-service";
import {
  AIWellnessCoach,
  AIFitnessTrainer,
  AICryptoAnalyst,
  AINewsDaily,
  AICareerCoach,
  AICreativeMuse,
  AIAuthorMuse,
  AITravelGuide,
  AIFoodCritic,
  AIPhotographyMentor,
  AILanguageTutor,
  AIInvestmentAdvisor,
  AIGameDeveloper,
  AIMovieRecommender,
  AIProductivityCoach,
  AIRelationshipAdvisor,
  AIHistoryTeacher,
  AIAstronomyGuide,
  AIScienceExplainer,
  AITechReviewer,
  AIBusinessMentor,
  AIStyleConsultant,
  AIGreenLivingExpert,
  AIPersonalFinanceAdvisor,
  type AICreator,
} from "@/lib/ai-creators-system";

export default function CreatorsScreen() {
  const router = useRouter();
  const [creators, setCreators] = useState<(CreatorProfile | AICreator)[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    // Load both human creators and AI creators
    const humanCreators = creatorContentService.getAllCreators();
    console.log('Human creators loaded:', humanCreators.length);
    
    const aiCreators = [
      AIWellnessCoach,
      AIFitnessTrainer,
      AICryptoAnalyst,
      AINewsDaily,
      AICareerCoach,
      AICreativeMuse,
      AIAuthorMuse,
      AITravelGuide,
      AIFoodCritic,
      AIPhotographyMentor,
      AILanguageTutor,
      AIInvestmentAdvisor,
      AIGameDeveloper,
      AIMovieRecommender,
      AIProductivityCoach,
      AIRelationshipAdvisor,
      AIHistoryTeacher,
      AIAstronomyGuide,
      AIScienceExplainer,
      AITechReviewer,
      AIBusinessMentor,
      AIStyleConsultant,
      AIGreenLivingExpert,
      AIPersonalFinanceAdvisor,
    ];
    console.log('AI creators loaded:', aiCreators.length);
    
    const allCreators = [...humanCreators, ...aiCreators];
    console.log('Total creators:', allCreators.length);
    
    setCreators(allCreators);
    setLoading(false);
  }, []);

  const handleCreatorPress = (creatorId: string, creatorName: string, isAI: boolean = false) => {
    // Navigate to creator detail page with ID as parameter
    router.push({
      pathname: "/creator/[id]",
      params: { id: creatorId, name: creatorName, isAI: isAI ? "true" : "false" },
    });
  };

  const isAICreator = (creator: any): creator is AICreator => {
    if (!creator) return false;
    return "omniCapabilities" in creator || "updateFrequency" in creator;
  };

  const renderCreatorCard = (creator: CreatorProfile | AICreator) => {
    if (!creator) return null;
    const isAI = isAICreator(creator);
    return (
    <View
      key={creator.id}
      className="bg-surface rounded-lg p-4 mb-4 border border-border"
    >
      <View className="flex-row items-center gap-3 mb-3">
        <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
          <Text className="text-white font-bold text-lg">{isAI ? creator.avatar : creator.name.charAt(0)}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-bold text-foreground">{creator.name}</Text>
            {isAI && <Text className="text-primary text-xs bg-primary/20 px-2 py-1 rounded">AI</Text>}
            {!isAI && creator && 'verifiedBadge' in creator && creator.verifiedBadge && <Text className="text-primary">✓</Text>}
          </View>
          <Text className="text-sm text-muted">{creator.handle}</Text>
        </View>
        <View className="items-center">
          <Text className="text-xs text-muted">{creator.tier.toUpperCase()}</Text>
        </View>
      </View>

      <Text className="text-sm text-muted mb-3 leading-relaxed">{creator.bio}</Text>

      <View className="flex-row justify-between mb-3 gap-2">
        <View className="flex-1 bg-background rounded p-2 items-center">
          <Text className="text-xs text-muted">Followers</Text>
          <Text className="text-sm font-bold text-foreground">{(creator.followers / 1000).toFixed(0)}K</Text>
        </View>
        <View className="flex-1 bg-background rounded p-2 items-center">
          <Text className="text-xs text-muted">{isAI ? 'Price' : 'Views'}</Text>
          <Text className="text-sm font-bold text-foreground">{isAI ? `$${creator.price.toFixed(2)}` : (creator && 'totalViews' in creator ? `${(creator.totalViews / 1000000).toFixed(1)}M` : 'N/A')}</Text>
        </View>
        <View className="flex-1 bg-background rounded p-2 items-center">
          <Text className="text-xs text-muted">Rating</Text>
          <Text className="text-sm font-bold text-foreground">{creator.rating.toFixed(1)}★</Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity 
          onPress={() => console.log('Follow:', creator.name)}
          className="flex-1 bg-primary rounded py-2 items-center">
          <Text className="text-white font-semibold text-sm">Follow</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleCreatorPress(creator.id, creator.name, isAI)}
          className="flex-1 bg-border rounded py-2 items-center">
          <Text className="text-foreground font-semibold text-sm">View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  };

  if (loading) {
    return (
      <ScreenContainer className="flex-1 bg-background items-center justify-center">
        <Text className="text-foreground">Loading creators...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          <Text className="text-3xl font-bold text-foreground mb-2">All Creators</Text>
          <Text className="text-base text-muted mb-6">Discover {creators.length} creators on UR</Text>

          {creators.length > 0 ? (
            <FlatList
              data={creators}
              renderItem={({ item }) => renderCreatorCard(item)}
              keyExtractor={(item, index) => item?.id || `creator-${index}`}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <View className="bg-surface rounded-lg p-6 border border-border items-center">
              <Text className="text-lg font-semibold text-foreground mb-2">No Creators Found</Text>
              <Text className="text-sm text-muted">Check back soon for more creators</Text>
            </View>
          )}

          <View className="mt-6 pt-6 border-t border-border">
            <Text className="text-sm text-muted text-center">Showing {creators.length} creators total</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
