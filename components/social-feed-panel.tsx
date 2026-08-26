import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Share,
  Platform,
  Image,
  Linking,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { SOCIAL_POST_DISCLOSURE, PLATFORM_DISCLOSURE_SHORT } from "@/lib/platform-disclosure-copy";
import {
  CREATOR_CONTENT_PROTECTION_NOTICE,
  CREATOR_CONTENT_RIGHTS_ATTESTATION_ORIGINAL,
  CREATOR_CONTENT_RIGHTS_ATTESTATION_REPOST,
  CREATOR_VERIFIED_BADGE_HINT,
  LICENSED_REPOST_ATTRIBUTION_HINT,
} from "@/lib/creator-content-protection-copy";
import {
  CONTENT_LICENSE_LABELS,
  type ContentLicenseType,
  type ContentRightsMode,
} from "@/lib/creator-content-protection-core";
import { SocialPostAssistantBar } from "@/components/social-post-assistant-bar";
import { brandDisclosureSurface, brandHighlightSurface, brandGradientPair, withAlpha } from "@/lib/brand-theme";
import { ContentProtectionReportSheet } from "@/components/content-protection-report-sheet";
import { LinearGradient } from "expo-linear-gradient";

type FeedSort = "latest" | "top" | "friends";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PostCard({
  post,
  myUserId,
  onRefresh,
}: {
  post: {
    id: string;
    authorUserId: string;
    authorName: string;
    authorAvatar: string;
    authorVerified?: boolean;
    body: string;
    kind: string;
    imageUrl?: string;
    videoUrl?: string;
    linkUrl?: string;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    likedByMe: boolean;
    hasAffiliateContent: boolean;
    hasAiDisclosure: boolean;
    contentRightsMode?: ContentRightsMode;
    attributionSourceName?: string;
    licenseType?: ContentLicenseType;
    hashtags: string[];
    createdAt: string;
    recentComments: Array<{ id: string; authorName: string; body: string }>;
  };
  myUserId: string;
  onRefresh: () => void;
}) {
  const colors = useColors();
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const like = trpc.social.toggleLike.useMutation({ onSuccess: () => onRefresh() });
  const comment = trpc.social.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      onRefresh();
    },
  });
  const del = trpc.social.deletePost.useMutation({ onSuccess: () => onRefresh() });
  const share = trpc.social.sharePost.useMutation({ onSuccess: () => onRefresh() });
  const commentsQ = trpc.social.listComments.useQuery(
    { postId: post.id },
    { enabled: showComments },
  );

  const sharePost = async () => {
    try {
      const result = await share.mutateAsync({ postId: post.id });
      await Share.share({ message: result.shareText });
    } catch {
      if (post.linkUrl) void Linking.openURL(post.linkUrl);
    }
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.postHeader}>
        <Text style={{ fontSize: 22 }}>{post.authorAvatar}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>
            {post.authorName}
            {post.authorVerified ? (
              <Text style={{ color: colors.primary, fontWeight: "700" }}> · {CREATOR_VERIFIED_BADGE_HINT}</Text>
            ) : null}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{timeAgo(post.createdAt)} · {post.kind}</Text>
        </View>
        {post.authorUserId === myUserId ? (
          <Pressable onPress={() => del.mutate({ postId: post.id })}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Delete</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setReportOpen(true)}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Report</Text>
          </Pressable>
        )}
      </View>

      <ContentProtectionReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        subjectUserId={post.authorUserId}
        subjectLabel={post.authorName}
        relatedAssetId={post.id}
      />

      {(post.hasAffiliateContent || post.hasAiDisclosure) ? (
        <View style={[styles.disclosure, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
          <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 14 }}>{SOCIAL_POST_DISCLOSURE}</Text>
        </View>
      ) : null}

      {post.contentRightsMode === "licensed_repost" ? (
        <View style={[styles.disclosure, { backgroundColor: `${colors.secondary}12`, borderColor: colors.secondary }]}>
          <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 14 }}>
            Licensed repost
            {post.attributionSourceName ? ` · Credit: ${post.attributionSourceName}` : ""}
            {post.licenseType ? ` · ${CONTENT_LICENSE_LABELS[post.licenseType]}` : ""}
          </Text>
        </View>
      ) : null}

      {post.body ? (
        <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22 }}>{post.body}</Text>
      ) : null}

      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.media}
          resizeMode="cover"
        />
      ) : null}

      {post.videoUrl ? (
        Platform.OS === "web" ? (
          // @ts-expect-error web video
          <video src={post.videoUrl} controls style={{ width: "100%", borderRadius: 10, maxHeight: 320 }} />
        ) : (
          <Pressable onPress={() => void Linking.openURL(post.videoUrl!)}>
            <View style={[styles.videoPlaceholder, { backgroundColor: colors.background }]}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>▶ Watch video</Text>
            </View>
          </Pressable>
        )
      ) : null}

      {post.linkUrl ? (
        <Pressable onPress={() => void Linking.openURL(post.linkUrl!)}>
          <Text style={{ color: colors.primary, fontSize: 13 }} numberOfLines={1}>
            🔗 {post.linkUrl}
          </Text>
        </Pressable>
      ) : null}

      {post.hashtags.length > 0 ? (
        <Text style={{ color: colors.primary, fontSize: 12 }}>{post.hashtags.join(" ")}</Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={() => like.mutate({ postId: post.id })} style={styles.actionBtn}>
          <Text style={{ color: post.likedByMe ? colors.primary : colors.foreground, fontWeight: "700" }}>
            {post.likedByMe ? "❤️" : "🤍"} {post.likeCount}
          </Text>
        </Pressable>
        <Pressable onPress={() => setShowComments((v) => !v)} style={styles.actionBtn}>
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>💬 {post.commentCount}</Text>
        </Pressable>
        <Pressable onPress={() => void sharePost()} style={styles.actionBtn}>
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>↗ {post.shareCount}</Text>
        </Pressable>
      </View>

      {(showComments ? commentsQ.data : post.recentComments)?.map((c) => (
        <View key={c.id} style={{ paddingVertical: 4 }}>
          <Text style={{ color: colors.foreground, fontSize: 13 }}>
            <Text style={{ fontWeight: "700" }}>{c.authorName}</Text> {c.body}
          </Text>
        </View>
      ))}

      {showComments ? (
        <View style={styles.commentRow}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Write a comment…"
            placeholderTextColor={colors.muted}
            style={[styles.commentInput, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable
            disabled={!commentText.trim() || comment.isPending}
            onPress={() => comment.mutate({ postId: post.id, body: commentText.trim() })}
            style={[styles.commentSend, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Post</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function SocialFeedPanel() {
  const colors = useColors();
  const { user } = useAuth();
  const myUserId = user?.id != null ? String(user.id) : "";
  const utils = trpc.useUtils();
  const [sort, setSort] = useState<FeedSort>("latest");
  const [hashtag, setHashtag] = useState<string | undefined>();
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [visibility, setVisibility] = useState<"public" | "friends">("public");
  const [showComposer, setShowComposer] = useState(true);
  const [aiAssisted, setAiAssisted] = useState(false);
  const [contentRightsMode, setContentRightsMode] = useState<ContentRightsMode>("original");
  const [attributionSourceName, setAttributionSourceName] = useState("");
  const [attributionSourceUrl, setAttributionSourceUrl] = useState("");
  const [licenseType, setLicenseType] = useState<ContentLicenseType>("platform_public");
  const [ownsContent, setOwnsContent] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const rightsAttestationText =
    contentRightsMode === "licensed_repost"
      ? CREATOR_CONTENT_RIGHTS_ATTESTATION_REPOST
      : CREATOR_CONTENT_RIGHTS_ATTESTATION_ORIGINAL;

  const canSubmitPost =
    ownsContent &&
    (body.trim().length > 0 || imageUrl.trim().length > 0 || videoUrl.trim().length > 0) &&
    (contentRightsMode === "original" ||
      (attributionSourceName.trim().length >= 2 && Boolean(licenseType)));

  const feed = trpc.social.feed.useQuery({ sort, hashtag });
  const trending = trpc.social.trendingHashtags.useQuery();
  const stats = trpc.social.feedStats.useQuery();

  const createPost = trpc.social.createPost.useMutation({
    onSuccess: () => {
      setBody("");
      setImageUrl("");
      setVideoUrl("");
      setAiAssisted(false);
      setContentRightsMode("original");
      setAttributionSourceName("");
      setAttributionSourceUrl("");
      setLicenseType("platform_public");
      setOwnsContent(false);
      setPostError(null);
      void utils.social.feed.invalidate();
      void utils.social.feedStats.invalidate();
      void utils.social.trendingHashtags.invalidate();
    },
    onError: (err) => setPostError(err.message),
  });

  const refresh = () => {
    void utils.social.feed.invalidate();
  };

  const sorts: { id: FeedSort; label: string }[] = [
    { id: "latest", label: "Latest" },
    { id: "top", label: "Top" },
    { id: "friends", label: "Friends" },
  ];
  const [gradStart, gradEnd] = brandGradientPair(colors);

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.disclosureBar, brandDisclosureSurface(colors)]}>
        <Text style={{ color: withAlpha(colors.secondary, 0.85), fontSize: 10, lineHeight: 14 }}>
          {PLATFORM_DISCLOSURE_SHORT}
        </Text>
      </View>

      {stats.data ? (
        <View style={[styles.statsRow, { borderColor: withAlpha(colors.secondary, 0.15) }]}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            {stats.data.postCount} posts · {stats.data.totalLikesReceived} likes · {stats.data.friendCount} friends
          </Text>
        </View>
      ) : null}

      <View style={[styles.sortBar, brandHighlightSurface(colors)]}>
        {sorts.map((s) => {
          const active = sort === s.id && !hashtag;
          return (
            <Pressable
              key={s.id}
              onPress={() => {
                setSort(s.id);
                setHashtag(undefined);
              }}
              style={styles.sortTab}
            >
              {active ? (
                <LinearGradient
                  colors={[gradStart, gradEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sortTabInner}
                >
                  <Text style={styles.sortTabTextActive}>{s.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.sortTabInner}>
                  <Text style={[styles.sortTabText, { color: colors.foreground }]}>{s.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {(trending.data ?? []).map((t) => (
          <Pressable
            key={t.tag}
            onPress={() => setHashtag(t.tag.replace("#", ""))}
            style={[
              styles.chip,
              {
                backgroundColor: hashtag === t.tag.replace("#", "")
                  ? withAlpha(colors.primary, 0.14)
                  : colors.surface,
                borderColor:
                  hashtag === t.tag.replace("#", "")
                    ? withAlpha(colors.secondary, 0.35)
                    : withAlpha(colors.border, 0.8),
              },
            ]}
          >
            <Text
              style={{
                color: hashtag === t.tag.replace("#", "") ? colors.secondary : colors.primary,
                fontWeight: "600",
                fontSize: 11,
              }}
            >
              {t.tag} ({t.count})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable onPress={() => setShowComposer((v) => !v)} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <Text style={{ color: colors.primary, fontWeight: "700" }}>
          {showComposer ? "▼ Hide composer" : "✏️ What's on your mind?"}
        </Text>
      </Pressable>

      {showComposer ? (
        <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <SocialPostAssistantBar
            onDraft={(draft) => setBody(draft)}
            onAiAssisted={() => setAiAssisted(true)}
          />

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Share an update, project photo, or promo — free for everyone… #hashtags welcome"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.composerInput, { borderColor: colors.border, color: colors.foreground }]}
          />
          <TextInput
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="Photo URL (optional)"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={[styles.urlInput, { borderColor: colors.border, color: colors.foreground }]}
          />
          <TextInput
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="Video URL — TikTok/Reels style (optional)"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={[styles.urlInput, { borderColor: colors.border, color: colors.foreground }]}
          />
          <View style={styles.visibilityRow}>
            {(["original", "licensed_repost"] as const).map((mode) => {
              const active = contentRightsMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setContentRightsMode(mode);
                    setOwnsContent(false);
                  }}
                  style={[
                    styles.visChip,
                    {
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
                    {mode === "original" ? "✍️ Original" : "↗️ Licensed repost"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {contentRightsMode === "licensed_repost" ? (
            <>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>{LICENSED_REPOST_ATTRIBUTION_HINT}</Text>
              <TextInput
                value={attributionSourceName}
                onChangeText={setAttributionSourceName}
                placeholder="Original creator or source name"
                placeholderTextColor={colors.muted}
                maxLength={80}
                style={[styles.urlInput, { borderColor: colors.border, color: colors.foreground }]}
              />
              <TextInput
                value={attributionSourceUrl}
                onChangeText={setAttributionSourceUrl}
                placeholder="Link to public post (optional)"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                maxLength={2000}
                style={[styles.urlInput, { borderColor: colors.border, color: colors.foreground }]}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {(Object.keys(CONTENT_LICENSE_LABELS) as ContentLicenseType[]).map((key) => {
                  const active = licenseType === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setLicenseType(key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? withAlpha(colors.primary, 0.14) : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? colors.primary : colors.foreground, fontSize: 11, fontWeight: "600" }}>
                        {CONTENT_LICENSE_LABELS[key]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          <View style={styles.visibilityRow}>
            {(["public", "friends"] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setVisibility(v)}
                style={[
                  styles.visChip,
                  {
                    backgroundColor: visibility === v ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: visibility === v ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
                  {v === "public" ? "🌍 Public" : "👥 Friends only"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 8 }}>
            {CREATOR_CONTENT_PROTECTION_NOTICE}
          </Text>
          <Pressable
            onPress={() => setOwnsContent((v) => !v)}
            style={styles.attestRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ownsContent }}
          >
            <View
              style={[
                styles.attestBox,
                {
                  borderColor: ownsContent ? colors.primary : colors.border,
                  backgroundColor: ownsContent ? colors.primary : colors.background,
                },
              ]}
            >
              {ownsContent ? <Text style={styles.attestCheck}>✓</Text> : null}
            </View>
            <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 17, flex: 1 }}>
              {rightsAttestationText}
            </Text>
          </Pressable>
          {postError ? (
            <Text style={{ color: colors.error ?? "#ef4444", fontSize: 12, marginBottom: 8 }}>{postError}</Text>
          ) : null}
          <Pressable
            disabled={createPost.isPending || !canSubmitPost}
            onPress={() =>
              createPost.mutate({
                body,
                imageUrl: imageUrl.trim() || undefined,
                videoUrl: videoUrl.trim() || undefined,
                visibility,
                aiAssisted: aiAssisted || undefined,
                contentRightsMode,
                rightsConfirmed: true,
                attributionSourceName:
                  contentRightsMode === "licensed_repost"
                    ? attributionSourceName.trim()
                    : undefined,
                attributionSourceUrl:
                  contentRightsMode === "licensed_repost"
                    ? attributionSourceUrl.trim() || undefined
                    : undefined,
                licenseType: contentRightsMode === "licensed_repost" ? licenseType : undefined,
              })
            }
            style={[
              styles.postBtn,
              {
                backgroundColor: colors.primary,
                opacity: createPost.isPending || !canSubmitPost ? 0.5 : 1,
              },
            ]}
          >
            {createPost.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.postBtnText}>Post free — like Facebook & TikTok</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {feed.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (feed.data?.posts ?? []).length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: "center", padding: 24 }}>
            No posts yet — be the first to share something on UR Platform!
          </Text>
        ) : (
          feed.data?.posts.map((post) => (
            <PostCard key={post.id} post={post} myUserId={myUserId} onRefresh={refresh} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  disclosureBar: { paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  statsRow: { paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  sortBar: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  sortTab: { flex: 1 },
  sortTabInner: {
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sortTabText: { fontSize: 12, fontWeight: "600" },
  sortTabTextActive: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  chipRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 6 },
  composer: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  composerInput: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 80, fontSize: 15, textAlignVertical: "top" },
  urlInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13 },
  visibilityRow: { flexDirection: "row", gap: 8 },
  visChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  attestRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 4 },
  attestBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  attestCheck: { color: "#fff", fontSize: 14, fontWeight: "800" },
  postBtn: { borderRadius: 10, padding: 14, alignItems: "center" },
  postBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  disclosure: { borderRadius: 8, borderWidth: 1, padding: 8 },
  media: { width: "100%", height: 220, borderRadius: 10 },
  videoPlaceholder: { height: 120, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", gap: 16, paddingTop: 4 },
  actionBtn: { paddingVertical: 4 },
  commentRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  commentInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  commentSend: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
});
