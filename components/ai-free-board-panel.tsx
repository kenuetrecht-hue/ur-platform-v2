import { useState } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import {
  AI_FREE_BOARD_RULE,
  AI_FREE_BOARD_RULE_SHORT,
  AI_FREE_BOARD_TEXT_HINT,
  AI_FREE_BOARD_TITLE,
  AI_FREE_BOARD_WATCH_HINT,
  type AiFreeBoardLane,
} from "@/lib/ai-free-board-policy";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AiFreeBoardPanel({
  compact = false,
  initialLane,
}: {
  compact?: boolean;
  initialLane?: AiFreeBoardLane;
}) {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [lane, setLane] = useState<AiFreeBoardLane | undefined>(initialLane);
  const utils = trpc.useUtils();
  const board = trpc.aiFreeBoard.list.useQuery({
    lane,
    limit: compact ? 4 : 40,
  });
  const like = trpc.aiFreeBoard.like.useMutation({
    onSuccess: () => void utils.aiFreeBoard.list.invalidate(),
  });
  const share = trpc.aiFreeBoard.share.useMutation({
    onSuccess: () => void utils.aiFreeBoard.list.invalidate(),
  });

  const posts = board.data?.posts ?? [];

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: compact ? 16 : 18 }}>
        {AI_FREE_BOARD_TITLE}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {compact ? AI_FREE_BOARD_RULE_SHORT : board.data?.rule ?? AI_FREE_BOARD_RULE}
      </Text>

      <View style={styles.laneRow}>
        {([
          { id: undefined, label: "All" },
          { id: "text" as const, label: "Text only" },
          { id: "watch" as const, label: "Videos + text" },
        ]).map((tab) => {
          const active = lane === tab.id;
          return (
            <Pressable
              key={tab.label}
              onPress={() => setLane(tab.id)}
              style={[
                styles.laneChip,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? `${colors.primary}18` : colors.surface,
                },
              ]}
            >
              <Text style={{ color: active ? colors.primary : colors.foreground, fontWeight: "700", fontSize: 12 }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {lane === "text" ? (
        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>{AI_FREE_BOARD_TEXT_HINT}</Text>
      ) : null}
      {lane === "watch" ? (
        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>{AI_FREE_BOARD_WATCH_HINT}</Text>
      ) : null}

      {board.isLoading ? <ActivityIndicator color={colors.primary} /> : null}

      {posts.map((post) => (
        <View
          key={post.id}
          style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <View style={styles.header}>
            <Text style={{ fontSize: 22 }}>{post.creatorAvatar}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: "800" }}>{post.creatorName}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                {post.category} · {post.lane === "watch" ? "Video + text" : "Text"} · {timeAgo(post.publishedAt)}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>{post.title}</Text>
          {post.lane === "watch" && post.durationMinutes ? (
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
              ▶ {post.durationMinutes} min lesson
            </Text>
          ) : null}
          <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
            {compact ? `${post.body.slice(0, 140)}${post.body.length > 140 ? "…" : ""}` : post.body}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 14 }}>{post.disclosure}</Text>
          <View style={styles.actions}>
            <Pressable
              disabled={!isAuthenticated || like.isPending}
              onPress={() => like.mutate({ postId: post.id })}
            >
              <Text style={{ color: post.likedByMe ? colors.primary : colors.foreground, fontWeight: "700" }}>
                {post.likedByMe ? "★" : "☆"} {post.likeCount}
              </Text>
            </Pressable>
            <Pressable
              disabled={!isAuthenticated || share.isPending}
              onPress={() => {
                void share.mutateAsync({ postId: post.id }).then((result) => Share.share({ message: result.shareText }));
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>↗ Share {post.shareCount}</Text>
            </Pressable>
            <Pressable onPress={() => router.push(post.talkHref as never)}>
              <Text style={{ color: colors.primary, fontWeight: "800" }}>
                {post.lane === "watch" ? "Watch / hear with this AI" : "Talk with this AI"}
              </Text>
            </Pressable>
          </View>
        </View>
      ))}

      {compact ? (
        <Pressable onPress={() => router.push("/discover/ai-board")}>
          <Text style={{ color: colors.primary, fontWeight: "800" }}>Open the full AI Free Board →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  laneRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  laneChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "center" },
});
