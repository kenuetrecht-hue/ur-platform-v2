import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { LANDING_THEME as T } from "@/lib/landing-theme";

/** Post-checkout deep link — /handoff?token=… */
export default function HandoffScreen() {
  const colors = useColors();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const tokenValue = typeof token === "string" ? token : "";

  const redeem = trpc.landing.redeemHandoff.useQuery(
    { token: tokenValue },
    { enabled: tokenValue.length >= 16, retry: false },
  );

  useEffect(() => {
    if (!redeem.data) return;
    router.replace({
      pathname: "/signup",
      params: {
        email: redeem.data.email,
        membership: "active",
      },
    });
  }, [redeem.data, router]);

  return (
    <>
      <Stack.Screen options={{ title: "Welcome to UR" }} />
      <ScreenContainer className="bg-background">
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            gap: 12,
          }}
        >
          {redeem.isLoading ? (
            <>
              <ActivityIndicator color={T.electric} size="large" />
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 17 }}>
                Activating your membership…
              </Text>
            </>
          ) : redeem.isError ? (
            <>
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
                Link unavailable
              </Text>
              <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 22 }}>
                {redeem.error.message}
              </Text>
            </>
          ) : redeem.data ? (
            <>
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
                PAYMENT SUCCESSFUL
              </Text>
              <Text style={{ color: colors.muted, textAlign: "center" }}>
                Redirecting to sign up with {redeem.data.email}…
              </Text>
            </>
          ) : (
            <Text style={{ color: colors.muted }}>Missing handoff token.</Text>
          )}
        </View>
      </ScreenContainer>
    </>
  );
}
