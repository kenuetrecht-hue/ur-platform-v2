import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { WarningBanner } from "@/components/warning-banner";
import { LaunchPromotionBanner } from "@/components/launch-promotion-banner";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

export default function KYCTermsAcceptanceScreen() {
  const colors = useColors();

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [contentAccepted, setContentAccepted] = useState(false);
  const [allAccepted, setAllAccepted] = useState(false);

  const handleAcceptAll = () => {
    setTermsAccepted(true);
    setPrivacyAccepted(true);
    setContentAccepted(true);
    setAllAccepted(true);
  };

  const handleContinue = () => {
    if (!termsAccepted || !privacyAccepted || !contentAccepted) {
      Alert.alert("Error", "You must accept all terms to continue");
      return;
    }
    // Navigate to OAuth sign-in
    router.push("/kyc-oauth-signin");
  };

  return (
    <ScreenContainer>
      <WarningBanner />
      <LaunchPromotionBanner tier="tier_1" discount={50} durationDays={180} lifetimeEntries={2} />
      <ScrollView className="flex-1 p-4 gap-6">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Terms & Conditions</Text>
          <Text className="text-base text-muted">
            Please review and accept all terms before creating your account. Your acceptance is legally binding.
          </Text>
        </View>

        {/* Step Indicator */}
        <View className="flex-row gap-2">
          <View className="flex-1 h-2 bg-primary rounded-full" />
          <View className="flex-1 h-2 bg-primary rounded-full" />
          <View className="flex-1 h-2 bg-primary rounded-full" />
        </View>

        {/* Terms Content */}
        <View className="bg-surface rounded-lg border border-border p-4 gap-4 max-h-64">
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">1. Age Verification (18+)</Text>
                <Text className="text-xs text-muted">
                  You confirm that you are at least 18 years of age. We have verified your identity through government-issued ID and facial recognition matching. Users under 18 are strictly prohibited from using this platform.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">2. Terms of Service</Text>
                <Text className="text-xs text-muted">
                  By using U R, you agree to comply with all applicable laws and our Terms of Service. You are responsible for your account and all activities conducted through it. UR LLC reserves the right to terminate accounts that violate our policies.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">3. AI Content Disclaimer</Text>
                <Text className="text-xs text-muted">
                  This platform contains AI-generated content. AI responses may contain inaccuracies and are not professional advice. Always verify information independently before acting on it. UR LLC assumes no liability for AI-generated content.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">4. Affiliate Disclosure</Text>
                <Text className="text-xs text-muted">
                  We may earn commissions from affiliate links. These commissions do not affect your purchase price and help support the platform. All affiliate relationships are clearly disclosed.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">5. User Responsibility</Text>
                <Text className="text-xs text-muted">
                  You are solely responsible for your interactions on this platform. UR LLC is not liable for disputes between users or third-party transactions. You assume all risks associated with using this platform.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">6. Content Policy</Text>
                <Text className="text-xs text-muted">
                  You agree not to post illegal, harmful, or abusive content. We reserve the right to remove content and terminate accounts that violate our policies without refund.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">7. Data Privacy</Text>
                <Text className="text-xs text-muted">
                  Your ID documents and facial data are encrypted and used only for verification. We comply with all privacy regulations. Your data will not be shared with third parties except as required by law.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Acceptance Checkboxes */}
        <View className="gap-3">
          <Pressable
            onPress={() => setTermsAccepted(!termsAccepted)}
            className={cn(
              "flex-row items-center gap-3 p-3 rounded-lg border",
              termsAccepted ? "border-primary bg-primary/10" : "border-border"
            )}
          >
            <View
              className={cn(
                "w-6 h-6 rounded border-2 items-center justify-center flex-shrink-0",
                termsAccepted ? "bg-primary border-primary" : "border-border"
              )}
            >
              {termsAccepted && <Text className="text-white font-bold">✓</Text>}
            </View>
            <Text className="text-sm text-foreground flex-1">
              I have read and agree to the Terms of Service
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPrivacyAccepted(!privacyAccepted)}
            className={cn(
              "flex-row items-center gap-3 p-3 rounded-lg border",
              privacyAccepted ? "border-primary bg-primary/10" : "border-border"
            )}
          >
            <View
              className={cn(
                "w-6 h-6 rounded border-2 items-center justify-center flex-shrink-0",
                privacyAccepted ? "bg-primary border-primary" : "border-border"
              )}
            >
              {privacyAccepted && <Text className="text-white font-bold">✓</Text>}
            </View>
            <Text className="text-sm text-foreground flex-1">
              I have read and agree to the Privacy Policy
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setContentAccepted(!contentAccepted)}
            className={cn(
              "flex-row items-center gap-3 p-3 rounded-lg border",
              contentAccepted ? "border-primary bg-primary/10" : "border-border"
            )}
          >
            <View
              className={cn(
                "w-6 h-6 rounded border-2 items-center justify-center flex-shrink-0",
                contentAccepted ? "bg-primary border-primary" : "border-border"
              )}
            >
              {contentAccepted && <Text className="text-white font-bold">✓</Text>}
            </View>
            <Text className="text-sm text-foreground flex-1">
              I understand AI content is for educational purposes only
            </Text>
          </Pressable>
        </View>

        {/* Accept All Button */}
        <Pressable
          onPress={handleAcceptAll}
          className="bg-surface border border-border rounded-lg py-3 items-center"
        >
          <Text className="text-foreground font-bold">Accept All Terms</Text>
        </Pressable>

        {/* Continue Button */}
        <Pressable
          onPress={handleContinue}
          disabled={!termsAccepted || !privacyAccepted || !contentAccepted}
          className={cn(
            "rounded-lg py-4 items-center",
            termsAccepted && privacyAccepted && contentAccepted ? "bg-primary" : "bg-gray-400"
          )}
        >
          <Text className="text-white font-bold text-lg">Continue to Sign In</Text>
        </Pressable>

        {/* Legal Notice */}
        <View className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 gap-2">
          <Text className="text-sm font-bold text-foreground">⚠️ Legally Binding Agreement</Text>
          <Text className="text-xs text-muted">
            By checking these boxes, you are entering into a legally binding agreement with UR LLC. Your acceptance is timestamped, recorded, and stored for compliance purposes. This agreement cannot be disputed after account creation.
          </Text>
        </View>

        <Text className="text-xs text-muted text-center">
          Step 3 of 3 • Terms Acceptance
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
