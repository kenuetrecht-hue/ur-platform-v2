import { useState } from "react";
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, HeaderBar, URMark } from "@/components/ur-ui";
import { useColors } from "@/hooks/use-colors";

export default function CreatorOnboardingScreen() {
  const colors = useColors();
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [hasAcceptedPayout, setHasAcceptedPayout] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleCreatorOnboarding() {
    if (!hasAcceptedTerms) {
      Alert.alert("Terms Required", "Please accept the Creator Terms & Conditions to continue.");
      return;
    }
    if (!hasAcceptedPayout) {
      Alert.alert("Payout Terms Required", "Please accept the Payout Structure & Moderation Policy to continue.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace("/creator-dashboard");
    }, 600);
  }

  return (
    <ScreenContainer>
      <HeaderBar title="Creator Setup" onBack={() => router.back()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginVertical: 16, gap: 12 }}>
            <URMark size={64} />
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>Creator Agreement</Text>
            <Text style={{ color: colors.muted, fontSize: 15, textAlign: "center" }}>
              Please review and accept our creator terms before launching your paid content
            </Text>
          </View>

          {/* Creator Terms Checkbox */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Creator Terms & Conditions</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
              By becoming a creator, you agree to maintain professional conduct, respect community guidelines, and comply with all platform policies. You are responsible for all content you publish.
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <Pressable
                onPress={() => setHasAcceptedTerms(!hasAcceptedTerms)}
                style={({ pressed }) => ({
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: hasAcceptedTerms ? colors.primary : colors.border,
                  backgroundColor: hasAcceptedTerms ? colors.primary : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                {hasAcceptedTerms && (
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>✓</Text>
                )}
              </Pressable>
              <Text style={{ color: colors.foreground, fontSize: 12, marginLeft: 12, flex: 1, lineHeight: 18 }}>
                I have read and agree to the{" "}
                <Text
                  style={{ color: colors.primary, fontWeight: "700", textDecorationLine: "underline" }}
                  onPress={() => router.push("/help")}
                >
                  Creator Terms & Conditions
                </Text>
              </Text>
            </View>
          </View>

          {/* Payout & Moderation Checkbox */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Payout Structure & Moderation</Text>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>85% Creator Payout:</Text> You keep 85% of all revenue from your paid chats and groups. UR retains 15% to cover platform operations and payment processing.
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>Moderation Policy:</Text> UR reserves the right to remove content or suspend creators who violate community standards. Violations include harassment, explicit content without consent, or illegal activity.
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>Dispute Resolution:</Text> Chargebacks and refund disputes are handled per our Terms of Service. Users who accept these terms cannot claim unauthorized transactions.
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <Pressable
                onPress={() => setHasAcceptedPayout(!hasAcceptedPayout)}
                style={({ pressed }) => ({
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: hasAcceptedPayout ? colors.primary : colors.border,
                  backgroundColor: hasAcceptedPayout ? colors.primary : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                {hasAcceptedPayout && (
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>✓</Text>
                )}
              </Pressable>
              <Text style={{ color: colors.foreground, fontSize: 12, marginLeft: 12, flex: 1, lineHeight: 18 }}>
                I understand and accept the{" "}
                <Text
                  style={{ color: colors.primary, fontWeight: "700", textDecorationLine: "underline" }}
                  onPress={() => router.push("/help")}
                >
                  Payout Structure & Moderation Policy
                </Text>
              </Text>
            </View>
          </View>

          <View style={{ opacity: hasAcceptedTerms && hasAcceptedPayout ? 1 : 0.5 }}>
            <PrimaryButton
              title="Accept & Launch Creator Account"
              size="lg"
              onPress={handleCreatorOnboarding}
              loading={loading}
              disabled={!hasAcceptedTerms || !hasAcceptedPayout}
            />
          </View>

          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ alignItems: "center", paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              Not ready? <Text style={{ color: colors.primary, fontWeight: "600" }}>Go back</Text>
            </Text>
          </Pressable>

          <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 16, marginTop: 8 }}>
            By accepting these terms, you create a legally binding agreement. Your acceptance is timestamped and recorded for compliance purposes.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
