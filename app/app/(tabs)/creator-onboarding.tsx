import { ScrollView, Text, View, TouchableOpacity, TextInput } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface OnboardingStep {
  step: number;
  title: string;
  completed: boolean;
}

interface OnboardingData {
  fullName: string;
  email: string;
  category: string;
  bio: string;
  pricingModel: "hourly" | "monthly" | "yearly";
  price: string;
  termsAccepted: boolean;
}

export default function CreatorOnboardingScreen() {
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    fullName: "",
    email: "",
    category: "",
    bio: "",
    pricingModel: "hourly",
    price: "",
    termsAccepted: false,
  });

  const steps: OnboardingStep[] = [
    { step: 1, title: "Profile", completed: currentStep > 1 },
    { step: 2, title: "Category", completed: currentStep > 2 },
    { step: 3, title: "Pricing", completed: currentStep > 3 },
    { step: 4, title: "Terms", completed: currentStep > 4 },
  ];

  const progressPercentage = (currentStep / 4) * 100;

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Save onboarding data
    console.log("Onboarding completed:", formData);
    // Navigate to creator dashboard
  };

  const updateFormData = (field: keyof OnboardingData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Creator Setup
            </Text>
            <Text className="text-sm text-muted">
              Step {currentStep} of 4
            </Text>
          </View>

          {/* Progress Bar */}
          <View className="gap-2">
            <View
              className="h-2 bg-border rounded-full overflow-hidden"
              style={{ backgroundColor: colors.border }}
            >
              <View
                className="h-full bg-primary rounded-full"
                style={{
                  width: `${progressPercentage}%`,
                  backgroundColor: colors.primary,
                }}
              />
            </View>
            <Text className="text-xs text-muted">{Math.round(progressPercentage)}% Complete</Text>
          </View>

          {/* Step Indicators */}
          <View className="flex-row gap-2 justify-between">
            {steps.map((s) => (
              <View
                key={s.step}
                className={`flex-1 h-10 rounded-lg items-center justify-center ${
                  s.step === currentStep
                    ? "bg-primary"
                    : s.completed
                      ? "bg-success"
                      : "bg-surface border border-border"
                }`}
                style={{
                  backgroundColor:
                    s.step === currentStep
                      ? colors.primary
                      : s.completed
                        ? colors.success
                        : colors.surface,
                  borderColor: colors.border,
                }}
              >
                <Text
                  className={`font-semibold ${
                    s.step === currentStep || s.completed
                      ? "text-background"
                      : "text-foreground"
                  }`}
                >
                  {s.step}
                </Text>
              </View>
            ))}
          </View>

          {/* Form Content */}
          <View className="gap-4 flex-1">
            {currentStep === 1 && (
              <View className="gap-4">
                <Text className="text-xl font-bold text-foreground">
                  Tell us about yourself
                </Text>

                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Full Name
                  </Text>
                  <TextInput
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChangeText={(text) => updateFormData("fullName", text)}
                    className="bg-surface border border-border rounded-lg p-3 text-foreground"
                    placeholderTextColor={colors.muted}
                  />
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Email
                  </Text>
                  <TextInput
                    placeholder="Enter your email"
                    value={formData.email}
                    onChangeText={(text) => updateFormData("email", text)}
                    keyboardType="email-address"
                    className="bg-surface border border-border rounded-lg p-3 text-foreground"
                    placeholderTextColor={colors.muted}
                  />
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Bio
                  </Text>
                  <TextInput
                    placeholder="Tell creators about yourself (max 200 characters)"
                    value={formData.bio}
                    onChangeText={(text) => updateFormData("bio", text.slice(0, 200))}
                    multiline
                    numberOfLines={4}
                    maxLength={200}
                    className="bg-surface border border-border rounded-lg p-3 text-foreground"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>
            )}

            {currentStep === 2 && (
              <View className="gap-4">
                <Text className="text-xl font-bold text-foreground">
                  What's your specialty?
                </Text>

                {[
                  "Video Editing",
                  "Audio Production",
                  "Content Creation",
                  "Graphic Design",
                  "Coaching",
                  "Other",
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => updateFormData("category", cat)}
                    className={`p-4 rounded-lg border-2 ${
                      formData.category === cat
                        ? "bg-primary border-primary"
                        : "bg-surface border-border"
                    }`}
                    style={{
                      backgroundColor:
                        formData.category === cat ? colors.primary : colors.surface,
                      borderColor:
                        formData.category === cat ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      className={`font-semibold ${
                        formData.category === cat
                          ? "text-background"
                          : "text-foreground"
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {currentStep === 3 && (
              <View className="gap-4">
                <Text className="text-xl font-bold text-foreground">
                  Set your pricing
                </Text>

                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Pricing Model
                  </Text>
                  {(["hourly", "monthly", "yearly"] as const).map((model) => (
                    <TouchableOpacity
                      key={model}
                      onPress={() => updateFormData("pricingModel", model)}
                      className={`p-3 rounded-lg border ${
                        formData.pricingModel === model
                          ? "bg-primary border-primary"
                          : "bg-surface border-border"
                      }`}
                      style={{
                        backgroundColor:
                          formData.pricingModel === model
                            ? colors.primary
                            : colors.surface,
                        borderColor:
                          formData.pricingModel === model
                            ? colors.primary
                            : colors.border,
                      }}
                    >
                      <Text
                        className={`font-semibold capitalize ${
                          formData.pricingModel === model
                            ? "text-background"
                            : "text-foreground"
                        }`}
                      >
                        {model}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Price ({formData.pricingModel === "hourly" ? "per hour" : "per month"})
                  </Text>
                  <TextInput
                    placeholder="Enter your price"
                    value={formData.price}
                    onChangeText={(text) => updateFormData("price", text)}
                    keyboardType="decimal-pad"
                    className="bg-surface border border-border rounded-lg p-3 text-foreground"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>
            )}

            {currentStep === 4 && (
              <View className="gap-4">
                <Text className="text-xl font-bold text-foreground">
                  Accept Terms
                </Text>

                <View className="bg-surface rounded-lg p-4 gap-3">
                  <Text className="text-sm text-foreground">
                    By becoming a creator on UR, you agree to:
                  </Text>
                  <Text className="text-xs text-muted">
                    • Follow our community guidelines
                  </Text>
                  <Text className="text-xs text-muted">
                    • Maintain professional conduct
                  </Text>
                  <Text className="text-xs text-muted">
                    • Provide quality content/services
                  </Text>
                  <Text className="text-xs text-muted">
                    • Respect user privacy
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    updateFormData("termsAccepted", !formData.termsAccepted)
                  }
                  className="flex-row items-center gap-3 p-3 bg-surface rounded-lg"
                >
                  <View
                    className={`w-6 h-6 rounded border-2 items-center justify-center ${
                      formData.termsAccepted
                        ? "bg-primary border-primary"
                        : "border-border"
                    }`}
                    style={{
                      backgroundColor: formData.termsAccepted
                        ? colors.primary
                        : "transparent",
                      borderColor: formData.termsAccepted
                        ? colors.primary
                        : colors.border,
                    }}
                  >
                    {formData.termsAccepted && (
                      <Text className="text-background font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="text-sm text-foreground flex-1">
                    I agree to the terms and conditions
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Navigation Buttons */}
          <View className="flex-row gap-3 pt-4">
            {currentStep > 1 && (
              <TouchableOpacity
                onPress={handleBack}
                className="flex-1 py-3 px-4 rounded-lg bg-surface border border-border items-center"
              >
                <Text className="font-semibold text-foreground">Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={currentStep === 4 ? handleComplete : handleNext}
              disabled={
                (currentStep === 1 && !formData.fullName) ||
                (currentStep === 2 && !formData.category) ||
                (currentStep === 3 && !formData.price) ||
                (currentStep === 4 && !formData.termsAccepted)
              }
              className={`flex-1 py-3 px-4 rounded-lg items-center ${
                currentStep === 4 ? "bg-success" : "bg-primary"
              }`}
              style={{
                backgroundColor:
                  currentStep === 4 ? colors.success : colors.primary,
                opacity:
                  (currentStep === 1 && !formData.fullName) ||
                  (currentStep === 2 && !formData.category) ||
                  (currentStep === 3 && !formData.price) ||
                  (currentStep === 4 && !formData.termsAccepted)
                    ? 0.5
                    : 1,
              }}
            >
              <Text className="font-semibold text-background">
                {currentStep === 4 ? "Complete Setup" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
