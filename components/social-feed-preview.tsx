import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { CONTENT_LICENSE_LABELS, type ContentLicenseType } from "@/lib/creator-content-protection-core";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function SocialFeedPreview() {
  const colors = useColors();
  const router = useRouter();
  const feed = trpc.social.feed.useQuery({ sort: "latest", limit: 3 });
  const trending = trpc.social.trendingHashtags.useQuery();

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
        Share updates, photos, and videos for free — like Facebook and TikTok. Subscribe to Social Post Assistant
        if you want AI help writing posts (no creator account required).
      </Text>

      {(trending.data ?? []).length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {trending.data!.slice(0, 4).map((t) => (
            <Text key={t.tag} style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>
              {t.tag}
            </Text>
          ))}
        </View>
      ) : null}

      {feed.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (feed.data?.posts ?? []).length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 13 }}>No posts yet — start the conversation!</Text>
      ) : (
        feed.data!.posts.map((post) => (
          <View
            key={post.id}
            style={{
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 12,
              gap: 4,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
              {post.authorAvatar} {post.authorName}
              {post.authorVerified ? " · ID verified" : ""}
              {post.contentRightsMode === "licensed_repost" ? " · ↗️ repost" : ""}
            </Text>
            {post.contentRightsMode === "licensed_repost" && post.attributionSourceName ? (
              <Text style={{ color: colors.muted, fontSize: 10 }}>
                Credit: {post.attributionSourceName}
                {post.licenseType
                  ? ` · ${CONTENT_LICENSE_LABELS[post.licenseType as ContentLicenseType]}`
                  : ""}
              </Text>
            ) : null}
            <Text style={{ color: colors.foreground, fontSize: 13 }} numberOfLines={2}>
              {post.body || (post.kind === "photo" ? "📷 Photo" : post.kind === "video" ? "🎬 Video" : "Post")}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              {timeAgo(post.createdAt)} · ❤️ {post.likeCount} · 💬 {post.commentCount}
            </Text>
          </View>
        ))
      )}

      <Pressable
        onPress={() => router.push("/(tabs)/messages")}
        style={{
          backgroundColor: colors.primary,
          borderRadius: 10,
          paddingVertical: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Open Social Feed →</Text>
      </Pressable>
    </View>
  );
}
