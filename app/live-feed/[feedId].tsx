import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PageBackButton } from "@/components/page-back-button";
import { LiveFeedStage } from "@/components/live-feed-stage";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";

export default function LiveFeedScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ feedId: string; guest?: string }>();
  const feedId = typeof params.feedId === "string" ? params.feedId : "";
  const guestToken = typeof params.guest === "string" ? params.guest : undefined;
  const { isAuthenticated } = useAuth();

  return (
    <ScreenContainer className="bg-background">
      <Stack.Screen options={{ title: "Live feed" }} />
      <View style={{ padding: 16, gap: 12 }}>
        <PageBackButton />
        {!feedId ? <Text style={{ color: colors.foreground }}>This live feed link is not valid.</Text> : null}
        {feedId && !isAuthenticated ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>Sign in to join</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
              Open this link again after you sign in. A free feed lets you in. A paid feed asks for the ticket.
            </Text>
            <Pressable
              onPress={() => router.push("/login")}
              style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Sign in</Text>
            </Pressable>
          </View>
        ) : null}
        {feedId && isAuthenticated ? <LiveFeedStage feedId={feedId} guestToken={guestToken} /> : null}
      </View>
    </ScreenContainer>
  );
}
