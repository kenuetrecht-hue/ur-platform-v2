import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

export default function AudioContentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(45);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(234);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Audio Title */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Meditation Guide</Text>
            <Text className="text-sm text-muted">By Wellness Creator • 3 days ago</Text>
          </View>

          {/* Audio Player */}
          <View className="bg-gradient-to-b from-primary/20 to-primary/5 rounded-2xl p-8 items-center gap-6 border border-primary/30">
            {/* Large Play Button */}
            <Pressable
              onPress={() => setIsPlaying(!isPlaying)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Text className="text-4xl">{isPlaying ? "⏸" : "▶"}</Text>
            </Pressable>

            {/* Progress Bar */}
            <View className="w-full gap-2">
              <View className="w-full h-1 bg-surface rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-muted">{formatTime(progress * 0.6)}</Text>
                <Text className="text-xs text-muted">{formatTime(60)}</Text>
              </View>
            </View>
          </View>

          {/* Audio Description */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-2">
            <Text className="text-sm font-semibold text-foreground">Description</Text>
            <Text className="text-sm text-muted leading-relaxed">
              A 10-minute guided meditation to help you relax and find inner peace. Perfect for
              bedtime or anytime you need a moment of calm.
            </Text>
          </View>

          {/* Audio Stats */}
          <View className="flex-row gap-4 justify-around">
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-primary">2.5K</Text>
              <Text className="text-xs text-muted">Plays</Text>
            </View>
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-primary">{likes}</Text>
              <Text className="text-xs text-muted">Likes</Text>
            </View>
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-primary">10:00</Text>
              <Text className="text-xs text-muted">Duration</Text>
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

          {/* Transcription */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-2">
            <Text className="text-sm font-semibold text-foreground">Transcription</Text>
            <Text className="text-xs text-muted leading-relaxed">
              &quot;Welcome to this guided meditation. Find a comfortable position and take a deep
              breath. Let your mind relax as we begin this peaceful journey...&quot;
            </Text>
            <Pressable
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  marginTop: 8,
                },
              ]}
            >
              <Text className="text-xs text-primary font-semibold">Read Full Transcription</Text>
            </Pressable>
          </View>

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
