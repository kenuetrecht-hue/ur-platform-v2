import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

export default function VideoTutorialScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(567);
  const [watchedSegments, setWatchedSegments] = useState([0, 1, 3]);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  const handleSegmentClick = (segment: number) => {
    if (!watchedSegments.includes(segment)) {
      setWatchedSegments([...watchedSegments, segment]);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-4">
          {/* Tutorial Header */}
          <View className="gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-bold text-foreground">AI Bot Tutorial</Text>
              <View className="bg-primary rounded-full px-2 py-1">
                <Text className="text-white text-xs font-bold">AI</Text>
              </View>
            </View>
            <Text className="text-sm text-muted">By AI Fitness Trainer</Text>
          </View>

          {/* Video Player */}
          <Pressable
            onPress={() => setIsPlaying(!isPlaying)}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View
              className="w-full aspect-video bg-surface rounded-2xl border-2 border-border items-center justify-center relative"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-4xl mb-2">{isPlaying ? "⏸" : "▶"}</Text>
              <Text className="text-muted text-center">
                {isPlaying ? "Playing Tutorial..." : "Tap to play tutorial"}
              </Text>
              <View className="absolute top-4 right-4 bg-primary rounded-full px-2 py-1">
                <Text className="text-white text-xs font-bold">🤖 AI</Text>
              </View>
            </View>
          </Pressable>

          {/* Tutorial Description */}
          <View className="bg-yellow-100 rounded-lg p-4 border border-yellow-400">
            <Text className="text-xs text-gray-900 font-semibold mb-2">
              ⚠️ DISCLAIMER: This is NOT medical advice. All content is for entertainment and
              educational purposes only.
            </Text>
            <Text className="text-xs text-gray-900">
              This tutorial is created by an AI bot for educational purposes. Always consult with
              professionals before making health decisions.
            </Text>
          </View>

          {/* Tutorial Stats */}
          <View className="flex-row gap-4 justify-around">
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-primary">3.2K</Text>
              <Text className="text-xs text-muted">Views</Text>
            </View>
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-primary">{likes}</Text>
              <Text className="text-xs text-muted">Likes</Text>
            </View>
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-primary">15:30</Text>
              <Text className="text-xs text-muted">Duration</Text>
            </View>
          </View>

          {/* Interactive Segments */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Tutorial Segments</Text>
            <View className="gap-2">
              {[
                { time: "0:00", title: "Introduction" },
                { time: "2:15", title: "Getting Started" },
                { time: "5:45", title: "Main Concepts" },
                { time: "10:20", title: "Advanced Tips" },
              ].map((segment, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSegmentClick(idx)}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.8 : 1,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: watchedSegments.includes(idx)
                        ? colors.primary
                        : colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View className="flex-row justify-between items-center">
                    <Text
                      className={`font-semibold ${
                        watchedSegments.includes(idx) ? "text-white" : "text-foreground"
                      }`}
                    >
                      {segment.title}
                    </Text>
                    <Text
                      className={`text-xs ${
                        watchedSegments.includes(idx) ? "text-white/70" : "text-muted"
                      }`}
                    >
                      {segment.time}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Like Button */}
          <Pressable
            onPress={handleLike}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.8 : 1,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 24,
                backgroundColor: liked ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: liked ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              className={`font-semibold text-center ${liked ? "text-white" : "text-foreground"}`}
            >
              {liked ? "❤️ Liked" : "🤍 Like"}
            </Text>
          </Pressable>

          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.8 : 1,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 24,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <Text className="text-foreground font-semibold text-center">Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
