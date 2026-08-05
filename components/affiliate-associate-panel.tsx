import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Share,
  Linking,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { CreatorAIInterface } from "@/components/creator-ai-interface";
import { AIDisclosureWrapper } from "@/components/ai-disclosure-wrapper";
import { AFFILIATE_ASSOCIATE_ID } from "@/lib/affiliate-associate-catalog";

const PLATFORMS = [
  { id: "facebook" as const, label: "Facebook" },
  { id: "instagram" as const, label: "Instagram" },
  { id: "twitter" as const, label: "X / Twitter" },
  { id: "linkedin" as const, label: "LinkedIn" },
  { id: "tiktok" as const, label: "TikTok" },
];

export function AffiliateAssociatePanel({ referralLink }: { referralLink: string }) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const posts = trpc.partnerDashboard.listAffiliateSocialPosts.useQuery();
  const scheduleWeekly = trpc.partnerDashboard.scheduleWeeklyAffiliatePosts.useMutation({
    onSuccess: () => void utils.partnerDashboard.listAffiliateSocialPosts.invalidate(),
  });
  const markShared = trpc.partnerDashboard.markAffiliatePostShared.useMutation({
    onSuccess: () => void utils.partnerDashboard.listAffiliateSocialPosts.invalidate(),
  });
  const [showChat, setShowChat] = useState(true);

  const sharePost = async (body: string, postId: string) => {
    try {
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(body);
      } else {
        await Share.share({ message: body });
      }
      markShared.mutate({ postId });
    } catch {
      Linking.openURL(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(body)}`,
      );
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.banner, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
          🔗 Associate AI — your affiliate sales helper
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          Text chat is free. Pay to hear Associate AI speak ($2.99 / 30 min voice pack) when your
          affiliate earnings justify it. Drafts social posts with your UR link and queues automatic sharing.
        </Text>
        <Pressable
          onPress={() => scheduleWeekly.mutate()}
          disabled={scheduleWeekly.isPending}
          style={[styles.btn, { backgroundColor: colors.primary, marginTop: 8 }]}
        >
          {scheduleWeekly.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Schedule weekly auto-posts (FB, X, IG)</Text>
          )}
        </Pressable>
      </View>

      <Pressable onPress={() => setShowChat((v) => !v)}>
        <Text style={{ color: colors.primary, fontWeight: "700" }}>
          {showChat ? "▼ Hide Associate AI chat" : "▶ Chat with Associate AI"}
        </Text>
      </Pressable>

      {showChat ? (
        <View style={{ height: 420 }}>
          <AIDisclosureWrapper aiName="Associate AI" hasAffiliateLinks>
            <CreatorAIInterface
              creatorId={AFFILIATE_ASSOCIATE_ID}
              creatorName="Associate AI"
              creatorAvatar="🔗"
              welcomeMessage={
                "Hi! I'm Associate AI — I help UR affiliates share referral links on social media. " +
                "Ask me to write a Facebook post, schedule promo copy, or coach you on referring creators. " +
                `Your link: ${referralLink}`
              }
            />
          </AIDisclosureWrapper>
        </View>
      ) : null}

      <Text style={{ color: colors.foreground, fontWeight: "800" }}>Scheduled & auto-posts</Text>
      {posts.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (posts.data ?? []).length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          No posts queued yet — ask Associate AI to draft posts, or tap Schedule weekly auto-posts.
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>
          {(posts.data ?? []).map((p) => (
            <View
              key={p.id}
              style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {PLATFORMS.find((x) => x.id === p.platform)?.label ?? p.platform} · {p.status}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={4}>
                {p.body}
              </Text>
              {p.status !== "posted" ? (
                <Pressable
                  onPress={() => void sharePost(p.body, p.id)}
                  style={[styles.btnSm, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.btnText}>Share now</Text>
                </Pressable>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 11 }}>Posted ✓</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6, marginBottom: 8 },
  btn: { borderRadius: 10, padding: 12, alignItems: "center" },
  btnSm: { borderRadius: 8, padding: 8, alignItems: "center", alignSelf: "flex-start" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
