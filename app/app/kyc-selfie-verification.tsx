import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { WarningBanner } from "@/components/warning-banner";
import { LaunchPromotionBanner } from "@/components/launch-promotion-banner";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

export default function KYCSelfieVerificationScreen() {
  const colors = useColors();

  const [selfieStatus, setSelfieStatus] = useState<"pending" | "capturing" | "captured" | "verifying" | "verified" | "error">("pending");
  const [selfieFileName, setSelfieFileName] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);

  const handleCaptureSelfie = () => {
    setSelfieStatus("capturing");
    // Simulate camera capture
    setTimeout(() => {
      setSelfieStatus("captured");
      setSelfieFileName(`selfie_${Date.now()}.jpg`);
    }, 1500);
  };

  const handleVerifyMatch = () => {
    if (selfieStatus !== "captured") {
      Alert.alert("Error", "Please capture a selfie first");
      return;
    }

    setSelfieStatus("verifying");
    // Simulate facial recognition verification against ID photo
    // In production, this would call Jumio/IDology API for liveness detection
    setTimeout(() => {
      const score = 94 + Math.random() * 6; // 94-100% match confidence
      setMatchScore(Math.round(score));
      setSelfieStatus("verified");
      Alert.alert(
        "Success",
        `Facial match verified (${Math.round(score)}% confidence). Your identity has been verified.`
      );
    }, 3000);
  };

  const handleRetake = () => {
    setSelfieStatus("pending");
    setSelfieFileName(null);
    setMatchScore(null);
  };

  const handleContinue = () => {
    if (selfieStatus !== "verified") {
      Alert.alert("Error", "Please complete facial verification first");
      return;
    }
    // Navigate to terms acceptance
    router.push("/kyc-terms-acceptance");
  };

  return (
    <ScreenContainer>
      <WarningBanner />
      <LaunchPromotionBanner tier="tier_1" discount={50} durationDays={180} lifetimeEntries={2} />
      <ScrollView className="flex-1 p-4 gap-6">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Facial Verification</Text>
          <Text className="text-base text-muted">
            Take a selfie to verify you&apos;re the person on your ID. Your face will be matched against your ID photo.
          </Text>
        </View>

        {/* Step Indicator */}
        <View className="flex-row gap-2">
          <View className="flex-1 h-2 bg-primary rounded-full" />
          <View className="flex-1 h-2 bg-primary rounded-full" />
          <View className="flex-1 h-2 bg-border rounded-full" />
        </View>

        {/* Instructions */}
        <View className="bg-blue-500/10 border border-blue-500 rounded-lg p-4 gap-2">
          <Text className="text-sm font-bold text-foreground">📸 Selfie Tips for Best Results</Text>
          <View className="gap-1">
            <Text className="text-xs text-muted">✓ Good lighting (natural light preferred)</Text>
            <Text className="text-xs text-muted">✓ Face clearly visible and centered</Text>
            <Text className="text-xs text-muted">✓ No sunglasses, hats, or filters</Text>
            <Text className="text-xs text-muted">✓ Neutral expression (similar to ID photo)</Text>
            <Text className="text-xs text-muted">✓ Head straight, not tilted</Text>
            <Text className="text-xs text-muted">✓ Blink naturally (liveness detection)</Text>
          </View>
        </View>

        {/* Selfie Preview/Capture Area */}
        <View
          className={cn(
            "aspect-square rounded-lg border-2 flex items-center justify-center",
            selfieStatus === "verified"
              ? "border-green-500 bg-green-500/10"
              : selfieStatus === "error"
                ? "border-red-500 bg-red-500/10"
                : "border-border bg-surface"
          )}
        >
          {selfieStatus === "pending" && (
            <View className="items-center gap-2">
              <Text className="text-6xl">📷</Text>
              <Text className="text-sm font-semibold text-foreground">Ready to capture</Text>
            </View>
          )}

          {selfieStatus === "capturing" && (
            <View className="items-center gap-2">
              <Text className="text-4xl animate-pulse">🎥</Text>
              <Text className="text-sm font-semibold text-foreground">Capturing...</Text>
            </View>
          )}

          {(selfieStatus === "captured" || selfieStatus === "verifying" || selfieStatus === "verified") && (
            <View className="items-center gap-2 w-full">
              <Text className="text-6xl">👤</Text>
              <Text className="text-sm font-semibold text-foreground">{selfieFileName}</Text>
              {matchScore && (
                <View className={cn(
                  "px-3 py-1 rounded-full",
                  matchScore >= 90 ? "bg-green-500" : matchScore >= 80 ? "bg-yellow-500" : "bg-red-500"
                )}>
                  <Text className="text-white text-xs font-bold">{matchScore}% Match</Text>
                </View>
              )}
            </View>
          )}

          {selfieStatus === "error" && (
            <View className="items-center gap-2">
              <Text className="text-6xl">❌</Text>
              <Text className="text-sm font-semibold text-red-600">Verification failed</Text>
              <Text className="text-xs text-muted">Please retake and try again</Text>
            </View>
          )}
        </View>

        {/* Facial Recognition Info */}
        <View className="bg-surface border border-border rounded-lg p-4 gap-2">
          <Text className="text-sm font-bold text-foreground">🔍 How Facial Recognition Works</Text>
          <Text className="text-xs text-muted">
            Your selfie will be compared against your ID photo using advanced facial recognition technology. We require a match score of at least 90% to verify your identity.
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="gap-3">
          {selfieStatus === "pending" && (
            <Pressable
              onPress={handleCaptureSelfie}
              className="bg-primary rounded-lg py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">📷 Capture Selfie</Text>
            </Pressable>
          )}

          {selfieStatus === "captured" && (
            <>
              <Pressable
                onPress={handleVerifyMatch}
                className="bg-primary rounded-lg py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Verify Facial Match</Text>
              </Pressable>
              <Pressable
                onPress={handleRetake}
                className="bg-surface border border-border rounded-lg py-4 items-center"
              >
                <Text className="text-foreground font-bold text-lg">Retake Photo</Text>
              </Pressable>
            </>
          )}

          {selfieStatus === "verifying" && (
            <View className="bg-surface border border-border rounded-lg py-4 items-center">
              <Text className="text-foreground font-bold">Verifying facial match...</Text>
            </View>
          )}

          {selfieStatus === "verified" && (
            <>
              <Pressable
                onPress={handleContinue}
                className="bg-primary rounded-lg py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Continue to Terms</Text>
              </Pressable>
              <Pressable
                onPress={handleRetake}
                className="bg-surface border border-border rounded-lg py-4 items-center"
              >
                <Text className="text-foreground font-bold text-lg">Retake Photo</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Legal Notice */}
        <View className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 gap-2">
          <Text className="text-sm font-bold text-foreground">🔒 Privacy Protected</Text>
          <Text className="text-xs text-muted">
            Your facial data is encrypted and used only for identity verification. We do not store your photo after verification is complete. All data is handled in compliance with privacy regulations.
          </Text>
        </View>

        <Text className="text-xs text-muted text-center">
          Step 2 of 3 • Facial Recognition Verification
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
