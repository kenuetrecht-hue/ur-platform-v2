import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

/** Universal custom link entry — /link/{slug} */
export default function CustomLinkScreen() {
  const colors = useColors();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const id = typeof slug === "string" ? slug : "";

  const resolved = trpc.partnerDashboard.resolveLink.useQuery(
    { slug: id },
    { enabled: Boolean(id), retry: 1 },
  );

  useEffect(() => {
    if (!resolved.data) return;
    if (resolved.data.signupParams) {
      router.replace({
        pathname: "/signup",
        params: resolved.data.signupParams,
      });
      return;
    }
    router.replace((resolved.data.redirectPath || "/home") as "/home");
  }, [resolved.data, router]);

  return (
    <>
      <Stack.Screen options={{ title: "UR Platform" }} />
      <ScreenContainer className="bg-background">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
          {resolved.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : resolved.data ? (
            <>
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 17 }}>
                Welcome — {resolved.data.displayName}
              </Text>
              <Text style={{ color: colors.muted, textAlign: "center" }}>Redirecting…</Text>
            </>
          ) : (
            <Text style={{ color: colors.foreground }}>Link not found.</Text>
          )}
        </View>
      </ScreenContainer>
    </>
  );
}
