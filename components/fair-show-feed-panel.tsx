import { ActivityIndicator, Pressable, Share, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { VideoStarRating } from "@/components/video-star-rating";
import { CREATOR_FREE_CONTENT_INCOME_RULE_SHORT, CREATOR_PAID_VIDEO_NO_SHARE } from "@/lib/creator-free-content-policy";

export function FairShowFeedPanel() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const feed = trpc.fairShow.discover.useQuery({ limit: 12 }, { enabled: isAuthenticated });
  const rate = trpc.fairShow.rateVideo.useMutation({
    onSuccess: () => void utils.fairShow.discover.invalidate(),
  });
  const shareFree = trpc.fairShow.shareFreeVideo.useMutation();

  if (!isAuthenticated) {
    return (
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>UR Fair Show</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          Sign in to see the fair feed. New creators get a reserved lane. We rank who stayed, not who
          already has the most fans.
        </Text>
        <Pressable
          onPress={() => router.push("/login")}
          style={{ backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (feed.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />;
  }

  const items = feed.data?.items ?? [];

  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>UR Fair Show</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {(feed.data?.rules ?? []).slice(0, 3).join(" ")}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {feed.data?.freeContentNote ?? CREATOR_FREE_CONTENT_INCOME_RULE_SHORT} Rate free videos 1–5
        stars. Share only free videos.
      </Text>
      {items.length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          No published videos yet. Host a cartoon or class replay and it gets a fair turn here.
        </Text>
      ) : (
        items.map((item) => (
          <View
            key={item.contentId}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 14,
              gap: 4,
            }}
          >
            <Pressable onPress={() => router.push(item.href as never)}>
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800" }}>
                {item.lane === "new" ? "NEW LANE" : item.lane === "category" ? "CATEGORY LANE" : "QUALITY LANE"}{" "}
                · {item.category}
              </Text>
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>{item.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {item.creatorName} · {item.durationSeconds}s · {item.kind.replace("_", " ")}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{item.why}</Text>
            </Pressable>
            <VideoStarRating
              compact
              average={item.rating?.average ?? 0}
              count={item.rating?.count ?? 0}
              myStars={item.rating?.myStars ?? null}
              disabled={rate.isPending}
              onRate={(stars) =>
                rate.mutate({ contentId: item.contentId, kind: item.kind, stars })
              }
            />
            {item.isFreeShareable ? (
              <Pressable
                onPress={() => {
                  void shareFree
                    .mutateAsync({ contentId: item.contentId, kind: item.kind })
                    .then((result) => Share.share({ message: result.shareText }))
                    .catch(() => undefined);
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
                  Share this free video
                </Text>
              </Pressable>
            ) : (
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15 }}>
                {CREATOR_PAID_VIDEO_NO_SHARE}
              </Text>
            )}
          </View>
        ))
      )}
    </View>
  );
}
