import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, TextInput } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
}

interface CreatorProfile {
  name: string;
  email: string;
  bio: string;
  selectedTier: "tier1" | "tier2" | "tier3" | null;
  bankAccount: string;
  payoutMethod: "direct_deposit" | "stripe" | null;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: "Welcome to UR",
    description: "Join the fastest-growing creator platform",
    icon: "🎉",
  },
  {
    id: 2,
    title: "Creator Profile",
    description: "Set up your profile and bio",
    icon: "👤",
  },
  {
    id: 3,
    title: "Select Your Tier",
    description: "Choose your promotional tier",
    icon: "🏆",
  },
  {
    id: 4,
    title: "Payment Setup",
    description: "Configure your payout method",
    icon: "💰",
  },
  {
    id: 5,
    title: "Ready to Go!",
    description: "Start earning with UR",
    icon: "🚀",
  },
];

export function CreatorOnboardingFlow({
  visible,
  onComplete,
  onClose,
}: {
  visible: boolean;
  onComplete: (profile: CreatorProfile) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<CreatorProfile>({
    name: "",
    email: "",
    bio: "",
    selectedTier: null,
    bankAccount: "",
    payoutMethod: null,
  });

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(profile);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepComplete = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return profile.name.length > 0 && profile.email.length > 0;
      case 3:
        return profile.selectedTier !== null;
      case 4:
        return profile.payoutMethod !== null;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const getTierInfo = (tier: "tier1" | "tier2" | "tier3") => {
    const tiers = {
      tier1: {
        title: "🥇 Tier 1: Founding Creator",
        earnings: "92.5% for 180 days",
        benefits: [
          "100% earnings for first 24 hours",
          "1 FREE TICKET EACH WEEK FOR LIFE",
          "Monthly drawing: 24-hour 100% earnings prize",
          "Exclusive Founding Creator badge",
        ],
        spotsLeft: 100,
      },
      tier2: {
        title: "🥈 Tier 2: Early Adopter",
        earnings: "94% for 90 days",
        benefits: [
          "100% earnings for first 24 hours",
          "Priority support",
          "Featured in creator directory",
        ],
        spotsLeft: 100,
      },
      tier3: {
        title: "🥉 Tier 3: Standard Creator",
        earnings: "92.5% for 30 days",
        benefits: [
          "100% earnings for first 24 hours",
          "Access to all creator tools",
        ],
        spotsLeft: 100,
      },
    };
    return tiers[tier];
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Progress Bar */}
        <View style={{ backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            {ONBOARDING_STEPS.map((step) => (
              <View
                key={step.id}
                style={{
                  flex: 1,
                  height: 4,
                  backgroundColor: step.id <= currentStep ? "#4F46E5" : colors.border,
                  borderRadius: 2,
                }}
              />
            ))}
          </View>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Step {currentStep} of {ONBOARDING_STEPS.length}
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <View style={{ gap: 20 }}>
              <View style={{ alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 64 }}>🎉</Text>
                <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground, textAlign: "center" }}>
                  Welcome to UR
                </Text>
                <Text style={{ fontSize: 16, color: colors.muted, textAlign: "center", lineHeight: 24 }}>
                  You're about to join the fastest-growing creator platform where you keep 85% of your earnings.
                </Text>
              </View>

              <LinearGradient
                colors={["#4F46E5", "#7C3AED"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 20, gap: 12 }}
              >
                <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>🚀 30-Day Launch Promotion</Text>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>
                  Join now and get exclusive tier benefits, 100% earnings for 24 hours, and more!
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* Step 2: Creator Profile */}
          {currentStep === 2 && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>👤 Your Profile</Text>

              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>Creator Name *</Text>
                <TextInput
                  placeholder="Enter your creator name"
                  value={profile.name}
                  onChangeText={(text) => setProfile({ ...profile, name: text })}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    color: colors.foreground,
                    fontSize: 14,
                  }}
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>Email Address *</Text>
                <TextInput
                  placeholder="your@email.com"
                  value={profile.email}
                  onChangeText={(text) => setProfile({ ...profile, email: text })}
                  keyboardType="email-address"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    color: colors.foreground,
                    fontSize: 14,
                  }}
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>Bio (Optional)</Text>
                <TextInput
                  placeholder="Tell us about yourself..."
                  value={profile.bio}
                  onChangeText={(text) => setProfile({ ...profile, bio: text })}
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    color: colors.foreground,
                    fontSize: 14,
                    textAlignVertical: "top",
                  }}
                  placeholderTextColor={colors.muted}
                />
              </View>
            </View>
          )}

          {/* Step 3: Select Tier */}
          {currentStep === 3 && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>🏆 Select Your Tier</Text>
              <Text style={{ color: colors.muted, fontSize: 14 }}>
                Choose the tier that works best for you. All tiers include 100% earnings for the first 24 hours!
              </Text>

              {(["tier1", "tier2", "tier3"] as const).map((tier) => {
                const info = getTierInfo(tier);
                const isSelected = profile.selectedTier === tier;

                return (
                  <Pressable
                    key={tier}
                    onPress={() => {
                      setProfile({ ...profile, selectedTier: tier });
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }}
                    style={{
                      borderWidth: 2,
                      borderColor: isSelected ? "#4F46E5" : colors.border,
                      borderRadius: 12,
                      padding: 16,
                      backgroundColor: isSelected ? "#4F46E5" + "10" : colors.surface,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 8 }}>
                      {info.title}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#4F46E5", marginBottom: 12 }}>
                      {info.earnings}
                    </Text>
                    {info.benefits.map((benefit, idx) => (
                      <Text key={idx} style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
                        ✓ {benefit}
                      </Text>
                    ))}
                    {tier === "tier1" && (
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#EF4444", marginTop: 8 }}>
                        ⚡ Only {info.spotsLeft} spots left!
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Step 4: Payment Setup */}
          {currentStep === 4 && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>💰 Payment Setup</Text>
              <Text style={{ color: colors.muted, fontSize: 14 }}>
                Choose how you'd like to receive your earnings. Payments are processed daily.
              </Text>

              <Pressable
                onPress={() => {
                  setProfile({ ...profile, payoutMethod: "stripe" });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
                style={{
                  borderWidth: 2,
                  borderColor: profile.payoutMethod === "stripe" ? "#4F46E5" : colors.border,
                  borderRadius: 12,
                  padding: 16,
                  backgroundColor: profile.payoutMethod === "stripe" ? "#4F46E5" + "10" : colors.surface,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 4 }}>
                  💳 Stripe Connect
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  Fast, secure payouts to your bank account
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setProfile({ ...profile, payoutMethod: "direct_deposit" });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
                style={{
                  borderWidth: 2,
                  borderColor: profile.payoutMethod === "direct_deposit" ? "#4F46E5" : colors.border,
                  borderRadius: 12,
                  padding: 16,
                  backgroundColor: profile.payoutMethod === "direct_deposit" ? "#4F46E5" + "10" : colors.surface,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 4 }}>
                  🏦 Direct Deposit
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  Traditional bank transfer to your account
                </Text>
              </Pressable>
            </View>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <View style={{ gap: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 64 }}>🚀</Text>
              <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground, textAlign: "center" }}>
                You're All Set!
              </Text>
              <Text style={{ fontSize: 16, color: colors.muted, textAlign: "center", lineHeight: 24 }}>
                Your account is ready. Start creating and earning with UR today!
              </Text>

              <LinearGradient
                colors={["#4F46E5", "#7C3AED"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 12, padding: 20, width: "100%", gap: 12 }}
              >
                <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>✨ Your Benefits:</Text>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                  • 100% earnings for first 24 hours
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                  • {profile.selectedTier === "tier1" ? "92.5%" : profile.selectedTier === "tier2" ? "94%" : "92.5%"} earnings
                  for promotional period
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                  • Daily payouts to your {profile.payoutMethod === "stripe" ? "Stripe account" : "bank account"}
                </Text>
              </LinearGradient>
            </View>
          )}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={{ flexDirection: "row", gap: 12, padding: 20, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Pressable
            onPress={handleBack}
            disabled={currentStep === 1}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: currentStep === 1 ? 0.5 : 1,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", textAlign: "center" }}>
              Back
            </Text>
          </Pressable>

          <Pressable
            onPress={currentStep === ONBOARDING_STEPS.length ? () => onComplete(profile) : handleNext}
            disabled={!isStepComplete()}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: isStepComplete() ? "#4F46E5" : colors.border,
              opacity: isStepComplete() ? 1 : 0.5,
            }}
          >
            <Text style={{ color: "white", fontSize: 14, fontWeight: "600", textAlign: "center" }}>
              {currentStep === ONBOARDING_STEPS.length ? "Complete" : "Next"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "600" }}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
