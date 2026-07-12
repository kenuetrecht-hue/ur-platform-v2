import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { WarningBanner } from "@/components/warning-banner";
import { LaunchPromotionBanner } from "@/components/launch-promotion-banner";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

export default function KYCOAuthSignInScreen() {
  const colors = useColors();

  const [signingIn, setSigningIn] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<"apple" | "google" | null>(null);

  const handleAppleSignIn = async () => {
    setSelectedProvider("apple");
    setSigningIn(true);
    try {
      // Simulate Apple OAuth flow
      await new Promise((resolve) => setTimeout(resolve, 2000));
      Alert.alert("Success", "Signed in with Apple!");
      // Navigate to home screen after successful sign-in
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Error", "Failed to sign in with Apple");
      setSigningIn(false);
      setSelectedProvider(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setSelectedProvider("google");
    setSigningIn(true);
    try {
      // Simulate Google OAuth flow
      await new Promise((resolve) => setTimeout(resolve, 2000));
      Alert.alert("Success", "Signed in with Google!");
      // Navigate to home screen after successful sign-in
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Error", "Failed to sign in with Google");
      setSigningIn(false);
      setSelectedProvider(null);
    }
  };

  return (
    <ScreenContainer>
      <WarningBanner />
      <LaunchPromotionBanner tier="tier_1" discount={50} durationDays={180} lifetimeEntries={2} />
      <ScrollView className="flex-1 p-4 gap-6">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Welcome to U R</Text>
          <Text className="text-base text-muted">
            You&apos;ve completed identity verification. Sign in to get started.
          </Text>
        </View>

        {/* Completion Badge */}
        <View className="bg-green-500/10 border border-green-500 rounded-lg p-4 gap-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl">✓</Text>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">18+ Verification Complete</Text>
              <Text className="text-xs text-muted">Your identity has been verified and confirmed.</Text>
            </View>
          </View>
        </View>

        {/* Sign In Options */}
        <View className="gap-4">
          <Text className="text-lg font-bold text-foreground">Sign In with One Tap</Text>

          {/* Apple Sign In */}
          <Pressable
            onPress={handleAppleSignIn}
            disabled={signingIn}
            className={cn(
              "flex-row items-center justify-center gap-3 rounded-lg py-4 border-2",
              selectedProvider === "apple"
                ? "bg-black border-black"
                : "bg-surface border-border"
            )}
          >
            <Text className="text-2xl">🍎</Text>
            <Text
              className={cn(
                "font-bold text-lg",
                selectedProvider === "apple" ? "text-white" : "text-foreground"
              )}
            >
              {selectedProvider === "apple" && signingIn ? "Signing in..." : "Sign in with Apple"}
            </Text>
          </Pressable>

          {/* Google Sign In */}
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={signingIn}
            className={cn(
              "flex-row items-center justify-center gap-3 rounded-lg py-4 border-2",
              selectedProvider === "google"
                ? "bg-blue-500 border-blue-500"
                : "bg-surface border-border"
            )}
          >
            <Text className="text-2xl">🔵</Text>
            <Text
              className={cn(
                "font-bold text-lg",
                selectedProvider === "google" ? "text-white" : "text-foreground"
              )}
            >
              {selectedProvider === "google" && signingIn ? "Signing in..." : "Sign in with Google"}
            </Text>
          </Pressable>
        </View>

        {/* Benefits */}
        <View className="gap-3">
          <Text className="text-lg font-bold text-foreground">Why One-Tap Sign In?</Text>
          <View className="gap-2">
            <View className="flex-row gap-2 items-start">
              <Text className="text-lg">⚡</Text>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Fast & Secure</Text>
                <Text className="text-xs text-muted">No password needed</Text>
              </View>
            </View>
            <View className="flex-row gap-2 items-start">
              <Text className="text-lg">🔐</Text>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Your Data is Safe</Text>
                <Text className="text-xs text-muted">Uses industry-standard OAuth</Text>
              </View>
            </View>
            <View className="flex-row gap-2 items-start">
              <Text className="text-lg">✓</Text>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Already Verified</Text>
                <Text className="text-xs text-muted">You&apos;ve completed KYC verification</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Privacy Notice */}
        <View className="bg-blue-500/10 border border-blue-500 rounded-lg p-4 gap-2">
          <Text className="text-sm font-bold text-foreground">🔒 Privacy First</Text>
          <Text className="text-xs text-muted">
            We only access your email and basic profile info. Your Apple/Google account remains secure and separate.
          </Text>
        </View>

        {/* Verification Summary */}
        <View className="bg-surface rounded-lg border border-border p-4 gap-3">
          <Text className="text-sm font-bold text-foreground">Verification Summary</Text>
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted">Age Verification</Text>
              <Text className="text-xs font-bold text-green-600">✓ 18+</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted">Government ID (Front & Back)</Text>
              <Text className="text-xs font-bold text-green-600">✓ Verified</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted">Facial Recognition</Text>
              <Text className="text-xs font-bold text-green-600">✓ Verified</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted">Terms Accepted</Text>
              <Text className="text-xs font-bold text-green-600">✓ Accepted</Text>
            </View>
          </View>
        </View>

        {/* Legal Notice */}
        <View className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 gap-2">
          <Text className="text-sm font-bold text-foreground">⚠️ Account Created</Text>
          <Text className="text-xs text-muted">
            By signing in, you confirm that all information provided is accurate and truthful. Your account is now active and ready to use.
          </Text>
        </View>

        {/* Terms Link */}
        <Text className="text-xs text-center text-muted">
          By signing in, you agree to our{" "}
          <Text className="text-primary font-bold">Terms of Service</Text> and{" "}
          <Text className="text-primary font-bold">Privacy Policy</Text>
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
