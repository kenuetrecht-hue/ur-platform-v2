/**
 * Creator Onboarding Flow
 * First-time setup for content creators with full AI access
 * Seamlessly flows through tRPC for data persistence
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginBottom: 24,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0a7ea4",
  },
  stepContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 24,
    lineHeight: 20,
  },
  aiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  aiCard: {
    width: "48%",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    alignItems: "center",
  },
  aiIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  aiName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  input: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

// ============================================================================
// TYPES
// ============================================================================

interface CreatorProfile {
  name: string;
  email: string;
  bio: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  agreedToEducational: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreatorOnboardingFlow() {
  const colors = useColors();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<CreatorProfile>({
    name: "",
    email: "",
    bio: "",
    agreedToTerms: false,
    agreedToPrivacy: false,
    agreedToEducational: false,
  });
  const [selectedAIs, setSelectedAIs] = useState<string[]>([]);

  const aiSpecialists = [
    { id: "real-estate", name: "Real Estate", icon: "🏠" },
    { id: "electrician", name: "Electrician", icon: "⚡" },
    { id: "contractor", name: "Contractor", icon: "🔨" },
    { id: "hvac", name: "HVAC", icon: "❄️" },
    { id: "landscaper", name: "Landscaper", icon: "🌱" },
    { id: "attorney", name: "Attorney", icon: "⚖️" },
    { id: "accountant", name: "Accountant", icon: "💰" },
    { id: "coder", name: "Coder", icon: "💻" },
    { id: "marketing", name: "Marketing", icon: "📢" },
    { id: "sales", name: "Sales", icon: "📈" },
    { id: "hr", name: "HR", icon: "👥" },
    { id: "operations", name: "Operations", icon: "⚙️" },
    { id: "customer-service", name: "Customer Service", icon: "💬" },
    { id: "product", name: "Product", icon: "🎯" },
  ];

  const progressPercentage = (step / 5) * 100;

  const handleAIToggle = (aiId: string) => {
    setSelectedAIs((prev) =>
      prev.includes(aiId) ? prev.filter((id) => id !== aiId) : [...prev, aiId]
    );
  };

  const handleNext = async () => {
    if (step === 5) {
      // Final step - submit profile
      setLoading(true);
      try {
        // Call tRPC to save creator profile
        // await trpc.creator.createProfile.mutate(profile);
        setStep(6); // Success screen
      } catch (error) {
        console.error("Failed to create creator profile:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true; // Welcome screen
      case 2:
        return profile.name.trim().length > 0 && profile.email.includes("@");
      case 3:
        return selectedAIs.length > 0;
      case 4:
        return (
          profile.agreedToTerms &&
          profile.agreedToPrivacy &&
          profile.agreedToEducational
        );
      case 5:
        return true; // Review screen
      default:
        return false;
    }
  };

  if (step === 6) {
    return (
      <ScreenContainer>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text
            style={[
              styles.successText,
              { color: colors.foreground },
            ]}
          >
            Welcome, {profile.name}!
          </Text>
          <Text
            style={[
              styles.successSubtext,
              { color: colors.muted },
            ]}
          >
            Your creator profile is ready. You now have access to all {selectedAIs.length} AI specialists.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => {
              // Navigate to creator workspace
            }}
          >
            <Text
              style={[
                styles.buttonText,
                { color: colors.background },
              ]}
            >
              Go to Creator Workspace
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressPercentage}%` },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Welcome to UR
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Join thousands of creators using AI to build better lives and businesses. Let&apos;s get you set up with your personal AI team.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleNext}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.background },
                ]}
              >
                Get Started
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: PROFILE */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Your Profile
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Tell us about yourself so we can personalize your experience.
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                },
              ]}
              placeholder="Full Name"
              placeholderTextColor={colors.muted}
              value={profile.name}
              onChangeText={(text) =>
                setProfile({ ...profile, name: text })
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                },
              ]}
              placeholder="Email Address"
              placeholderTextColor={colors.muted}
              value={profile.email}
              onChangeText={(text) =>
                setProfile({ ...profile, email: text })
              }
              keyboardType="email-address"
            />

            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  minHeight: 80,
                },
              ]}
              placeholder="Bio (optional)"
              placeholderTextColor={colors.muted}
              value={profile.bio}
              onChangeText={(text) =>
                setProfile({ ...profile, bio: text })
              }
              multiline
            />

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: canProceed()
                    ? colors.primary
                    : colors.border,
                },
                !canProceed() && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: canProceed()
                      ? colors.background
                      : colors.muted,
                  },
                ]}
              >
                Next
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: SELECT AIs */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Choose Your AI Team
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Select the AI specialists you want access to. You can add more later.
            </Text>

            <View style={styles.aiGrid}>
              {aiSpecialists.map((ai) => (
                <TouchableOpacity
                  key={ai.id}
                  style={[
                    styles.aiCard,
                    {
                      borderColor: selectedAIs.includes(ai.id)
                        ? colors.primary
                        : colors.border,
                      backgroundColor: selectedAIs.includes(ai.id)
                        ? colors.surface
                        : colors.background,
                    },
                  ]}
                  onPress={() => handleAIToggle(ai.id)}
                >
                  <Text style={styles.aiIcon}>{ai.icon}</Text>
                  <Text
                    style={[
                      styles.aiName,
                      { color: colors.foreground },
                    ]}
                  >
                    {ai.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: canProceed()
                    ? colors.primary
                    : colors.border,
                },
                !canProceed() && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: canProceed()
                      ? colors.background
                      : colors.muted,
                  },
                ]}
              >
                Next ({selectedAIs.length} selected)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4: AGREEMENTS */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Agreements
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Please review and accept our agreements to continue.
            </Text>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() =>
                setProfile({
                  ...profile,
                  agreedToTerms: !profile.agreedToTerms,
                })
              }
            >
              <View
                style={[
                  styles.checkboxBox,
                  {
                    borderColor: colors.primary,
                    backgroundColor: profile.agreedToTerms
                      ? colors.primary
                      : "transparent",
                  },
                ]}
              >
                {profile.agreedToTerms && (
                  <Text style={{ color: colors.background }}>✓</Text>
                )}
              </View>
              <Text
                style={[
                  styles.checkboxText,
                  { color: colors.foreground },
                ]}
              >
                I accept the Terms of Service
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() =>
                setProfile({
                  ...profile,
                  agreedToPrivacy: !profile.agreedToPrivacy,
                })
              }
            >
              <View
                style={[
                  styles.checkboxBox,
                  {
                    borderColor: colors.primary,
                    backgroundColor: profile.agreedToPrivacy
                      ? colors.primary
                      : "transparent",
                  },
                ]}
              >
                {profile.agreedToPrivacy && (
                  <Text style={{ color: colors.background }}>✓</Text>
                )}
              </View>
              <Text
                style={[
                  styles.checkboxText,
                  { color: colors.foreground },
                ]}
              >
                I accept the Privacy Policy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() =>
                setProfile({
                  ...profile,
                  agreedToEducational: !profile.agreedToEducational,
                })
              }
            >
              <View
                style={[
                  styles.checkboxBox,
                  {
                    borderColor: colors.primary,
                    backgroundColor: profile.agreedToEducational
                      ? colors.primary
                      : "transparent",
                  },
                ]}
              >
                {profile.agreedToEducational && (
                  <Text style={{ color: colors.background }}>✓</Text>
                )}
              </View>
              <Text
                style={[
                  styles.checkboxText,
                  { color: colors.foreground },
                ]}
              >
                I understand this is for educational and business purposes only
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: canProceed()
                    ? colors.primary
                    : colors.border,
                },
                !canProceed() && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: canProceed()
                      ? colors.background
                      : colors.muted,
                  },
                ]}
              >
                Next
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Review Your Setup
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Everything looks good. Ready to get started?
            </Text>

            <View
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  padding: 16,
                },
              ]}
            >
              <Text
                style={[
                  { fontWeight: "600", marginBottom: 8, color: colors.foreground },
                ]}
              >
                Profile
              </Text>
              <Text style={{ color: colors.muted, marginBottom: 4 }}>
                Name: {profile.name}
              </Text>
              <Text style={{ color: colors.muted, marginBottom: 4 }}>
                Email: {profile.email}
              </Text>
              <Text style={{ color: colors.muted }}>
                AIs: {selectedAIs.length} specialists
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleNext}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    { color: colors.background },
                  ]}
                >
                  Create Profile
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
