import { Text } from "react-native";
import { useRouter } from "expo-router";
import { AppPressable } from "@/components/app-pressable";
import { useColors } from "@/hooks/use-colors";
import { withAlpha } from "@/lib/brand-theme";
import { trpc } from "@/lib/trpc";

/** Home-page door. Signup does not choose creator or follower. */
export function BecomeCreatorHomeCard() {
  const colors = useColors();
  const router = useRouter();
  const dash = trpc.partnerDashboard.creatorDashboard.useQuery(undefined, {
    retry: 0,
    staleTime: 60_000,
  });

  if (dash.data?.enrolled) return null;

  return (
    <AppPressable
      onPress={() => router.push("/creator-dashboard")}
      testID="become-content-creator"
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.42),
        gap: 4,
      }}
    >
      <Text pointerEvents="none" style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
        Become a content creator
      </Text>
      <Text pointerEvents="none" style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
        You joined as a member. Open this when you want to host classes and sell.
      </Text>
    </AppPressable>
  );
}
