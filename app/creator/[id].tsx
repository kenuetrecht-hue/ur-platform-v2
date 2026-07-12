import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { creatorContentService, CreatorProfile, CreatorContent } from "@/lib/creator-content-service";
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

export default function CreatorDetailScreen() {
  const { id, isAI } = useLocalSearchParams<{ id: string; isAI: string }>();
  const router = useRouter();
  const [creator, setCreator] = useState<CreatorProfile | AICreator | null>(null);
  const [content, setContent] = useState<CreatorContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && typeof id === "string") {
      if (isAI === "true") {
        // Load AI creator
        const aiCreators: { [key: string]: AICreator } = {
          "ai-wellness-001": AIWellnessCoach,
          "ai-fitness-001": AIFitnessTrainer,
          "ai-crypto-001": AICryptoAnalyst,
          "ai-news-001": AINewsDaily,
          "ai-career-001": AICareerCoach,
          "ai-creative-001": AICreativeMuse,
          "ai-author-001": AIAuthorMuse,
          "ai-travel-001": AITravelGuide,
          "ai-food-001": AIFoodCritic,
          "ai-photography-001": AIPhotographyMentor,
          "ai-language-001": AILanguageTutor,
          "ai-investment-001": AIInvestmentAdvisor,
          "ai-gamedev-001": AIGameDeveloper,
          "ai-movie-001": AIMovieRecommender,
          "ai-productivity-001": AIProductivityCoach,
          "ai-relationship-001": AIRelationshipAdvisor,
          "ai-history-001": AIHistoryTeacher,
          "ai-astronomy-001": AIAstronomyGuide,
          "ai-science-001": AIScienceExplainer,
          "ai-tech-001": AITechReviewer,
          "ai-business-001": AIBusinessMentor,
          "ai-style-001": AIStyleConsultant,
          "ai-greenliving-001": AIGreenLivingExpert,
          "ai-finance-001": AIPersonalFinanceAdvisor,
        };
        const aiCreator = aiCreators[id];
        if (aiCreator) {
          setCreator(aiCreator);
        }
      } else {
        // Load human creator
        const creatorData = creatorContentService.getCreatorById(id);
        if (creatorData) {
          setCreator(creatorData);
          setContent(creatorData.content);
        }
      }
    }
    setLoading(false);
  }, [id, isAI]);

  const checkIsAICreator = (creator: any): creator is AICreator => {
    if (!creator) return false;
    return "omniCapabilities" in creator || "updateFrequency" in creator;
  };

  if (loading) {
    return (
      <ScreenContainer className="flex-1 bg-background items-center justify-center">
        <Text className="text-foreground">Loading creator...</Text>
      </ScreenContainer>
    );
  }

  if (!creator) {
    return (
      <ScreenContainer className="flex-1 bg-background items-center justify-center">
        <Text className="text-foreground mb-4">Creator not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary px-6 py-2 rounded"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const isAICreatorFlag = checkIsAICreator(creator);

  const renderContentItem = (item: CreatorContent) => (
    <View key={item.id} className="bg-surface rounded-lg p-4 mb-4 border border-border">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">{item.title}</Text>
          <Text className="text-xs text-muted mt-1">{item.category}</Text>
        </View>
        <View className="bg-primary px-2 py-1 rounded">
          <Text className="text-xs text-white font-semibold">{item.type.toUpperCase()}</Text>
        </View>
      </View>

      <Text className="text-sm text-muted mb-3">{item.description}</Text>

      <View className="flex-row justify-between gap-2 mb-3">
        <View className="flex-1 bg-background rounded p-2 items-center">
          <Text className="text-xs text-muted">Views</Text>
          <Text className="text-sm font-bold text-foreground">{(item.views / 1000).toFixed(0)}K</Text>
        </View>
        <View className="flex-1 bg-background rounded p-2 items-center">
          <Text className="text-xs text-muted">Likes</Text>
          <Text className="text-sm font-bold text-foreground">{(item.likes / 1000).toFixed(1)}K</Text>
        </View>
        <View className="flex-1 bg-background rounded p-2 items-center">
          <Text className="text-xs text-muted">Comments</Text>
          <Text className="text-sm font-bold text-foreground">{(item.comments / 100).toFixed(0)}K</Text>
        </View>
        <View className="flex-1 bg-background rounded p-2 items-center">
          <Text className="text-xs text-muted">Shares</Text>
          <Text className="text-sm font-bold text-foreground">{(item.shares / 100).toFixed(0)}K</Text>
        </View>
      </View>

      {item.earnings && (
        <View className="bg-success/20 rounded p-2 items-center">
          <Text className="text-sm font-bold text-success">${item.earnings.toFixed(2)} Earned</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-6">
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-primary font-semibold">← Back</Text>
          </TouchableOpacity>

          {/* Creator Profile Card */}
          <View className="bg-surface rounded-lg p-6 mb-6 border border-border">
            <View className="flex-row items-center gap-4 mb-4">
              <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
                <Text className="text-white font-bold text-2xl">{isAICreatorFlag ? creator.avatar : creator.name.charAt(0)}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl font-bold text-foreground">{creator.name}</Text>
                  {isAICreatorFlag && <Text className="text-primary text-xs bg-primary/20 px-2 py-1 rounded">AI Creator</Text>}
                </View>
                <Text className="text-sm text-muted">{creator.handle}</Text>
                <View className="mt-1 bg-primary/20 px-2 py-1 rounded w-fit">
                  <Text className="text-xs font-bold text-primary">{creator.tier.toUpperCase()}</Text>
                </View>
              </View>
            </View>

            <Text className="text-sm text-muted mb-4 leading-relaxed">{creator.bio}</Text>

            {isAICreatorFlag && creator && "disclaimer" in creator && (
              <View className="bg-warning/10 border border-warning/30 rounded p-3 mb-4">
                <Text className="text-xs text-warning">{creator.disclaimer}</Text>
              </View>
            )}

            <View className="flex-row justify-between gap-2 mb-4">
              <View className="flex-1 bg-background rounded p-3 items-center">
                <Text className="text-xs text-muted">Followers</Text>
                <Text className="text-lg font-bold text-foreground">{(creator.followers / 1000).toFixed(0)}K</Text>
              </View>
              <View className="flex-1 bg-background rounded p-3 items-center">
                <Text className="text-xs text-muted">{isAICreatorFlag ? "Price" : "Following"}</Text>
                <Text className="text-lg font-bold text-foreground">
                  {isAICreatorFlag ? `$${creator.price.toFixed(2)}` : (creator && "following" in creator ? creator.following : "N/A")}
                </Text>
              </View>
              <View className="flex-1 bg-background rounded p-3 items-center">
                <Text className="text-xs text-muted">{isAICreatorFlag ? "Updates" : "Views"}</Text>
                <Text className="text-lg font-bold text-foreground">
                  {isAICreatorFlag ? (creator && "updateFrequency" in creator ? creator.updateFrequency.split("(")[0] : "Daily") : (creator && "totalViews" in creator ? `${(creator.totalViews / 1000000).toFixed(1)}M` : "N/A")}
                </Text>
              </View>
              <View className="flex-1 bg-background rounded p-3 items-center">
                <Text className="text-xs text-muted">Rating</Text>
                <Text className="text-lg font-bold text-foreground">{creator.rating.toFixed(1)}★</Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity className="flex-1 bg-primary rounded py-3 items-center">
                <Text className="text-white font-bold">{isAICreatorFlag ? "Subscribe" : "Follow"}</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-border rounded py-3 items-center">
                <Text className="text-foreground font-bold">{isAICreatorFlag ? "Book Session" : "Message"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Creator Info */}
          {isAICreatorFlag && creator && "topics" in creator && (
            <View className="bg-surface rounded-lg p-4 mb-6 border border-border">
              <Text className="text-lg font-bold text-foreground mb-3">Expertise Topics</Text>
              <View className="flex-row gap-2 flex-wrap">
                {creator.topics.map((topic: string, idx: number) => (
                  <View key={idx} className="bg-primary/20 rounded-full px-3 py-1">
                    <Text className="text-xs text-primary font-semibold">{topic}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* AI Creator Capabilities */}
          {isAICreatorFlag && creator && "omniCapabilities" in creator && (
            <View className="bg-surface rounded-lg p-4 mb-6 border border-border">
              <Text className="text-lg font-bold text-foreground mb-3">What I Can Do</Text>
              <View className="gap-2">
                {creator.omniCapabilities.map((capability: string, idx: number) => (
                  <View key={idx} className="flex-row items-start gap-2">
                    <Text className="text-primary font-bold">✓</Text>
                    <Text className="text-sm text-foreground flex-1">{capability}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* AI Creator Description */}
          {isAICreatorFlag && creator && "description" in creator && (
            <View className="bg-surface rounded-lg p-4 mb-6 border border-border">
              <Text className="text-lg font-bold text-foreground mb-3">About This AI</Text>
              <Text className="text-sm text-muted leading-relaxed">{creator.description}</Text>
            </View>
          )}

          {/* Earnings Summary (Human Creators) */}
          {!isAICreatorFlag && creator && "totalEarnings" in creator && (
            <View className="bg-success/10 rounded-lg p-4 mb-6 border border-success/30">
              <Text className="text-sm text-muted mb-2">Total Earnings</Text>
              <Text className="text-3xl font-bold text-success">${creator.totalEarnings.toLocaleString()}</Text>
              <Text className="text-xs text-muted mt-2">From {content.length} content pieces</Text>
            </View>
          )}

          {/* Content Section (Human Creators) */}
          {!isAICreatorFlag && content.length > 0 && (
            <View>
              <Text className="text-2xl font-bold text-foreground mb-4">Content ({content.length})</Text>
              {content.map((item) => renderContentItem(item))}
            </View>
          )}

          {/* Social Links */}
          {!isAICreatorFlag && creator && "socialLinks" in creator && creator.socialLinks && Object.keys(creator.socialLinks).length > 0 && (
            <View className="mt-6 pt-6 border-t border-border">
              <Text className="text-lg font-bold text-foreground mb-3">Follow On Social</Text>
              <View className="flex-row gap-2 flex-wrap">
                {creator.socialLinks.instagram && (
                  <TouchableOpacity className="bg-surface rounded px-4 py-2 border border-border">
                    <Text className="text-sm text-foreground">📷 Instagram</Text>
                  </TouchableOpacity>
                )}
                {creator.socialLinks.twitter && (
                  <TouchableOpacity className="bg-surface rounded px-4 py-2 border border-border">
                    <Text className="text-sm text-foreground">𝕏 Twitter</Text>
                  </TouchableOpacity>
                )}
                {creator.socialLinks.youtube && (
                  <TouchableOpacity className="bg-surface rounded px-4 py-2 border border-border">
                    <Text className="text-sm text-foreground">▶️ YouTube</Text>
                  </TouchableOpacity>
                )}
                {creator.socialLinks.tiktok && (
                  <TouchableOpacity className="bg-surface rounded px-4 py-2 border border-border">
                    <Text className="text-sm text-foreground">🎵 TikTok</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
