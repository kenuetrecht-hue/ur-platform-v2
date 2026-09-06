import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

export function FairShowFeedPanel() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const feed = trpc.fairShow.discover.useQuery({ limit: 12 }, { enabled: isAuthenticated });

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
      {items.length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          No published videos yet. Host a cartoon or class replay and it gets a fair turn here.
        </Text>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.contentId}
            onPress={() => router.push(item.href as never)}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 14,
              gap: 4,
            }}
          >
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
        ))
      )}
    </View>
  );
}
