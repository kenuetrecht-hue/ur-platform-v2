import { View, Text, Pressable, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { AFTER_ID_PASS_HREF } from "@/lib/after-sign-in";
import { FinishAccountAfterIdPass } from "@/components/finish-account-after-id-pass";

/** Leftover address — same join form as /signup so people are never stuck on a second path. */
export default function AgeVerifyScreen() {
  const colors = useColors();
  const router = useRouter();
  const { logout, isAuthenticated } = useAuth();
  const statusQuery = trpc.ageKyc.getStatus.useQuery(undefined, {
    retry: 0,
    enabled: isAuthenticated,
  });
  const verified = statusQuery.data?.verified === true;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer className="bg-background">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 64, gap: 14, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 24 }}>
            Sign up
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            Same page as Sign up. Name, email, and password first. Then the three pictures.
          </Text>

          {verified ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.primary,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "800" }}>You already passed</Text>
              <Text style={{ color: colors.muted, marginTop: 6 }}>
                You are confirmed 18 or older. You can enter UR Platform.
              </Text>
              <View style={{ marginTop: 12 }}>
                <PrimaryActionButton
                  label="Enter the app"
                  onPress={() => router.replace(AFTER_ID_PASS_HREF)}
                  backgroundColor={colors.primary}
                />
              </View>
            </View>
          ) : (
            <FinishAccountAfterIdPass />
          )}

          <Pressable onPress={() => void logout()} style={{ paddingVertical: 8 }}>
            <Text style={{ color: colors.muted, textAlign: "center" }}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
