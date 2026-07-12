import { ScrollView, Text, View, Pressable, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

export default function VideoPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const [isPlaying, setIsPlaying] = useState(false);
  const [likes, setLikes] = useState(342);
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<{ user: string; text: string }[]>([
    { user: "Alex", text: "Great video! 🎉" },
    { user: "Jordan", text: "Love this content!" },
  ]);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  const handleAddComment = () => {
    if (comment.trim()) {
      setComments([...comments, { user: "You", text: comment }]);
      setComment("");
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-4">
          {/* Video Title */}
          <View className="gap-1">
            <Text className="text-2xl font-bold text-foreground">Amazing Tutorial</Text>
            <Text className="text-sm text-muted">Posted by Creator Name • 2 days ago</Text>
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
              className="w-full aspect-video bg-surface rounded-2xl border-2 border-border items-center justify-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-4xl mb-2">{isPlaying ? "⏸" : "▶"}</Text>
              <Text className="text-muted text-center">
                {isPlaying ? "Playing..." : "Tap to play video"}
              </Text>
            </View>
          </Pressable>

          {/* Video Description */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-2">
            <Text className="text-sm font-semibold text-foreground">Description</Text>
            <Text className="text-sm text-muted leading-relaxed">
              In this tutorial, I&apos;ll show you how to create amazing content. Watch till the end for
              a special bonus tip!
            </Text>
          </View>

          {/* Video Stats */}
          <View className="flex-row gap-4 justify-around">
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-primary">1.2K</Text>
              <Text className="text-xs text-muted">Views</Text>
            </View>
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-primary">{likes}</Text>
              <Text className="text-xs text-muted">Likes</Text>
            </View>
            <View className="bg-surface rounded-lg p-3 flex-1 items-center border border-border">
              <Text className="text-2xl font-bold text-primary">{comments.length}</Text>
              <Text className="text-xs text-muted">Comments</Text>
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

          {/* Comments Section */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Comments</Text>
            <View className="bg-surface rounded-lg border border-border p-3 gap-3 max-h-40">
              {comments.map((c, idx) => (
                <View key={idx} className="border-b border-border pb-2">
                  <Text className="text-xs font-semibold text-primary">{c.user}</Text>
                  <Text className="text-xs text-foreground">{c.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Add Comment */}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-foreground"
              placeholder="Add a comment..."
              placeholderTextColor={colors.muted}
              value={comment}
              onChangeText={setComment}
            />
            <Pressable
              onPress={handleAddComment}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Text className="text-white font-semibold">Post</Text>
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
