import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { WarningBanner } from "@/components/warning-banner";
import { LaunchPromotionBanner } from "@/components/launch-promotion-banner";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

export default function KYCIDVerificationScreen() {
  const colors = useColors();

  const [idType, setIdType] = useState<"passport" | "drivers_license" | "national_id">("drivers_license");
  const [idNumber, setIdNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  
  // Front and back ID uploads (MANDATORY for 18+ verification)
  const [frontIdStatus, setFrontIdStatus] = useState<"pending" | "uploading" | "uploaded" | "error">("pending");
  const [frontIdFileName, setFrontIdFileName] = useState<string | null>(null);
  
  const [backIdStatus, setBackIdStatus] = useState<"pending" | "uploading" | "uploaded" | "error">("pending");
  const [backIdFileName, setBackIdFileName] = useState<string | null>(null);

  const handleFrontIDUpload = () => {
    if (!idNumber.trim()) {
      Alert.alert("Error", "Please enter your ID number");
      return;
    }
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }
    if (!dateOfBirth.trim()) {
      Alert.alert("Error", "Please enter your date of birth (MM/DD/YYYY)");
      return;
    }

    setFrontIdStatus("uploading");
    // Simulate upload
    setTimeout(() => {
      setFrontIdStatus("uploaded");
      setFrontIdFileName(`${idType}_front_${Date.now()}.jpg`);
    }, 2000);
  };

  const handleBackIDUpload = () => {
    if (frontIdStatus !== "uploaded") {
      Alert.alert("Error", "Please upload the front of your ID first");
      return;
    }

    setBackIdStatus("uploading");
    // Simulate upload
    setTimeout(() => {
      setBackIdStatus("uploaded");
      setBackIdFileName(`${idType}_back_${Date.now()}.jpg`);
      Alert.alert("Success", "Both sides of ID uploaded successfully. Proceeding to facial verification...");
    }, 2000);
  };

  const handleContinue = () => {
    if (frontIdStatus !== "uploaded" || backIdStatus !== "uploaded") {
      Alert.alert("Error", "Please upload both the front and back of your ID");
      return;
    }
    // Navigate to selfie verification
    router.push("/kyc-selfie-verification");
  };

  const bothIdsSaved = frontIdStatus === "uploaded" && backIdStatus === "uploaded";

  return (
    <ScreenContainer>
      <WarningBanner />
      <LaunchPromotionBanner tier="tier_1" discount={50} durationDays={180} lifetimeEntries={2} />
      <ScrollView className="flex-1 p-4 gap-6">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Government ID Verification</Text>
          <Text className="text-base text-muted">
            To verify you are 18+, we need both the front and back of your government-issued ID.
          </Text>
        </View>

        {/* Step Indicator */}
        <View className="flex-row gap-2">
          <View className="flex-1 h-2 bg-primary rounded-full" />
          <View className="flex-1 h-2 bg-border rounded-full" />
          <View className="flex-1 h-2 bg-border rounded-full" />
        </View>

        {/* ID Type Selection */}
        <View className="gap-3">
          <Text className="text-lg font-bold text-foreground">Select ID Type</Text>
          {(["passport", "drivers_license", "national_id"] as const).map((type) => (
            <Pressable
              key={type}
              onPress={() => setIdType(type)}
              className={cn(
                "border-2 rounded-lg p-4 flex-row items-center gap-3",
                idType === type ? "border-primary bg-primary/10" : "border-border"
              )}
            >
              <View
                className={cn(
                  "w-6 h-6 rounded-full border-2 items-center justify-center",
                  idType === type ? "border-primary bg-primary" : "border-border"
                )}
              >
                {idType === type && <Text className="text-white font-bold">✓</Text>}
              </View>
              <Text className={cn("text-base font-semibold", idType === type ? "text-primary" : "text-foreground")}>
                {type === "passport"
                  ? "Passport"
                  : type === "drivers_license"
                    ? "Driver's License"
                    : "National ID"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Form Fields */}
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-sm font-bold text-foreground">Full Name (as shown on ID)</Text>
            <TextInput
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View className="gap-2">
            <Text className="text-sm font-bold text-foreground">ID Number</Text>
            <TextInput
              placeholder="Enter your ID number"
              value={idNumber}
              onChangeText={setIdNumber}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View className="gap-2">
            <Text className="text-sm font-bold text-foreground">Date of Birth</Text>
            <TextInput
              placeholder="MM/DD/YYYY"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        {/* FRONT ID Upload Section */}
        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-bold text-foreground">Front of ID</Text>
            {frontIdStatus === "uploaded" && <Text className="text-green-600 font-bold">✓</Text>}
          </View>
          <Pressable
            onPress={handleFrontIDUpload}
            disabled={frontIdStatus === "uploading"}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 items-center justify-center gap-2",
              frontIdStatus === "uploaded"
                ? "border-green-500 bg-green-500/10"
                : frontIdStatus === "uploading"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-border bg-surface"
            )}
          >
            {frontIdStatus === "pending" && (
              <>
                <Text className="text-4xl">📷</Text>
                <Text className="text-sm font-semibold text-foreground">Tap to upload front of ID</Text>
                <Text className="text-xs text-muted">JPG, PNG, or PDF (max 10MB)</Text>
              </>
            )}
            {frontIdStatus === "uploading" && (
              <>
                <Text className="text-2xl">⏳</Text>
                <Text className="text-sm font-semibold text-foreground">Uploading front...</Text>
              </>
            )}
            {frontIdStatus === "uploaded" && (
              <>
                <Text className="text-2xl">✓</Text>
                <Text className="text-sm font-semibold text-green-600">Front uploaded</Text>
                <Text className="text-xs text-muted">{frontIdFileName}</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* BACK ID Upload Section */}
        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-bold text-foreground">Back of ID</Text>
            {backIdStatus === "uploaded" && <Text className="text-green-600 font-bold">✓</Text>}
          </View>
          <Pressable
            onPress={handleBackIDUpload}
            disabled={frontIdStatus !== "uploaded" || backIdStatus === "uploading"}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 items-center justify-center gap-2",
              frontIdStatus !== "uploaded"
                ? "border-gray-400 bg-gray-400/5 opacity-50"
                : backIdStatus === "uploaded"
                  ? "border-green-500 bg-green-500/10"
                  : backIdStatus === "uploading"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-border bg-surface"
            )}
          >
            {frontIdStatus !== "uploaded" && (
              <>
                <Text className="text-4xl">🔒</Text>
                <Text className="text-sm font-semibold text-muted">Upload front first</Text>
              </>
            )}
            {frontIdStatus === "uploaded" && backIdStatus === "pending" && (
              <>
                <Text className="text-4xl">📷</Text>
                <Text className="text-sm font-semibold text-foreground">Tap to upload back of ID</Text>
                <Text className="text-xs text-muted">JPG, PNG, or PDF (max 10MB)</Text>
              </>
            )}
            {backIdStatus === "uploading" && (
              <>
                <Text className="text-2xl">⏳</Text>
                <Text className="text-sm font-semibold text-foreground">Uploading back...</Text>
              </>
            )}
            {backIdStatus === "uploaded" && (
              <>
                <Text className="text-2xl">✓</Text>
                <Text className="text-sm font-semibold text-green-600">Back uploaded</Text>
                <Text className="text-xs text-muted">{backIdFileName}</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Legal Notice */}
        <View className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 gap-2">
          <Text className="text-sm font-bold text-foreground">🔒 Your Data is Secure</Text>
          <Text className="text-xs text-muted">
            Your ID information is encrypted and stored securely. We only use it for age verification and will not share it with third parties. Both the front and back of your ID are required for verification.
          </Text>
        </View>

        {/* Continue Button */}
        <Pressable
          onPress={handleContinue}
          disabled={!bothIdsSaved}
          className={cn(
            "rounded-lg py-4 items-center",
            bothIdsSaved ? "bg-primary" : "bg-gray-400"
          )}
        >
          <Text className="text-white font-bold text-lg">Continue to Facial Verification</Text>
        </Pressable>

        <Text className="text-xs text-muted text-center">
          Step 1 of 3 • Government ID Verification (Front & Back)
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
