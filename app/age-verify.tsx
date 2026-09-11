import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { AGE_KYC_MIN_AGE } from "@/lib/age-kyc-policy";
import { AGE_VERIFY_TITLE } from "@/lib/signup-step-copy";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { explainAuthFailure } from "@/lib/auth-network-error";
import { AFTER_ID_PASS_HREF } from "@/lib/after-sign-in";
import { getAgeKycPassToken } from "@/lib/age-kyc-pass-store";
import { claimStoredAgeKycPass } from "@/lib/claim-stored-age-kyc-pass";
import { FinishAccountAfterIdPass } from "@/components/finish-account-after-id-pass";

export default function AgeVerifyScreen() {
  const colors = useColors();
  const router = useRouter();
  const { logout, isAuthenticated } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const claimAttempted = useRef(false);

  const statusQuery = trpc.ageKyc.getStatus.useQuery(undefined, {
    retry: 1,
    enabled: isAuthenticated,
  });
  const claimPass = trpc.ageKyc.claimPass.useMutation();

  useEffect(() => {
    if (!statusQuery.error) return;
    const msg = explainAuthFailure(statusQuery.error);
    setLocalError(msg);
    if (msg.toLowerCase().includes("sign in with your email")) {
      void logout();
    }
  }, [statusQuery.error, logout]);

  useEffect(() => {
    if (!isAuthenticated || !getAgeKycPassToken() || claimAttempted.current) return;
    claimAttempted.current = true;
    void claimStoredAgeKycPass((input) => claimPass.mutateAsync(input))
      .then((claimed) => {
        if (claimed) {
          void statusQuery.refetch();
          router.replace(AFTER_ID_PASS_HREF);
        }
      })
      .catch((err) => setLocalError(explainAuthFailure(err)));
  }, [isAuthenticated, claimPass, router, statusQuery]);

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
            {AGE_KYC_MIN_AGE}+ identity check
          </Text>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>{AGE_VERIFY_TITLE}</Text>

          {verified ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.primary,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "800" }}>Verified</Text>
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

          {localError && !verified ? (
            <Text style={{ color: "#c0392b", fontSize: 13, lineHeight: 18 }}>{localError}</Text>
          ) : null}

          <Pressable onPress={() => void logout()} style={{ paddingVertical: 8 }}>
            <Text style={{ color: colors.muted, textAlign: "center" }}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
