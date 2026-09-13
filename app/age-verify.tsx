import { View, Text, Pressable, ScrollView } from "react-native";
import { Redirect, Stack, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { AFTER_ID_PASS_HREF, RETURNING_LOGIN_HREF } from "@/lib/after-sign-in";
import { FinishAccountAfterIdPass } from "@/components/finish-account-after-id-pass";
import { UrBootShell } from "@/components/ur-boot-shell";

/** Leftover address. Signed-out people go to Login. New people who still need ID stay here. */
export default function AgeVerifyScreen() {
  const colors = useColors();
  const router = useRouter();
  const { logout, isAuthenticated, isLoading } = useAuth();
  const statusQuery = trpc.ageKyc.getStatus.useQuery(undefined, {
    retry: 2,
    enabled: isAuthenticated,
  });
  const verified = statusQuery.data?.verified === true;

  if (isLoading && !isAuthenticated) {
    return <UrBootShell label="Opening UR…" />;
  }

  if (!isAuthenticated) {
    return <Redirect href={RETURNING_LOGIN_HREF} />;
  }

  if (statusQuery.isLoading) {
    return <UrBootShell label="Checking your pictures…" />;
  }

  if (verified) {
    return <Redirect href={AFTER_ID_PASS_HREF} />;
  }

  if (statusQuery.isError) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenContainer className="bg-background">
          <View style={{ padding: 20, gap: 14 }}>
            <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 24 }}>Login</Text>
            <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
              We could not confirm your pictures on this phone yet. If you are already a member,
              use Login. Do not take the pictures again.
            </Text>
            <PrimaryActionButton
              label="Go to Login"
              onPress={() => router.replace(RETURNING_LOGIN_HREF)}
              backgroundColor={colors.primary}
            />
          </View>
        </ScreenContainer>
      </>
    );
  }

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

          <FinishAccountAfterIdPass />

          <Pressable onPress={() => void logout()} style={{ paddingVertical: 8 }}>
            <Text style={{ color: colors.muted, textAlign: "center" }}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
