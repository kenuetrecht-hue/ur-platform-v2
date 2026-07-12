import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { biometricAuthService } from "@/lib/biometric-auth-service";

type AuthMethod = "facial" | "fingerprint" | "backup";

export default function BiometricAuthScreen() {
  const colors = useColors();
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [isAuthenticating, isAuthenticatingSet] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [authResult, setAuthResult] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const lockoutStatus = biometricAuthService.getLockoutStatus();

  const handleFacialAuth = async () => {
    isAuthenticatingSet(true);
    setAuthMethod("facial");

    try {
      // Simulate facial capture
      const faceData = "simulated_face_data_" + Date.now();
      const result = await biometricAuthService.authenticateWithFacial(faceData);

      setAuthResult(result.message);
      setShowResult(true);

      if (result.success) {
        setTimeout(() => {
          router.push("/(tabs)/admin-profile");
        }, 2000);
      }
    } catch (error) {
      setAuthResult("Facial recognition error. Please try again.");
      setShowResult(true);
    } finally {
      isAuthenticatingSet(false);
    }
  };

  const handleFingerprintAuth = async () => {
    isAuthenticatingSet(true);
    setAuthMethod("fingerprint");

    try {
      // Simulate fingerprint capture
      const fingerprintData = "simulated_fingerprint_" + Date.now();
      const result = await biometricAuthService.authenticateWithFingerprint(fingerprintData);

      setAuthResult(result.message);
      setShowResult(true);

      if (result.success) {
        setTimeout(() => {
          router.push("/(tabs)/admin-profile");
        }, 2000);
      }
    } catch (error) {
      setAuthResult("Fingerprint recognition error. Please try again.");
      setShowResult(true);
    } finally {
      isAuthenticatingSet(false);
    }
  };

  const handleBackupCodeAuth = () => {
    if (!backupCode.trim()) {
      Alert.alert("Error", "Please enter a backup code");
      return;
    }

    const result = biometricAuthService.authenticateWithBackupCode(backupCode);
    setAuthResult(result.message);
    setShowResult(true);

    if (result.success) {
      setTimeout(() => {
        router.push("/(tabs)/admin-profile");
      }, 2000);
    }

    setBackupCode("");
  };

  if (lockoutStatus.isLocked) {
    const remainingMinutes = Math.ceil((lockoutStatus.remainingTime || 0) / 1000 / 60);
    return (
      <ScreenContainer className="flex-1 bg-background justify-center items-center px-4">
        <View className="items-center gap-4">
          <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center">
            <IconSymbol name="lock.fill" size={32} color="#EF4444" />
          </View>
          <Text className="text-2xl font-bold text-foreground text-center">Account Locked</Text>
          <Text className="text-base text-muted text-center">
            Too many failed authentication attempts. Please try again in {remainingMinutes} minute
            {remainingMinutes !== 1 ? "s" : ""}.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="bg-gradient-to-r from-primary to-purple-600 px-4 py-8 items-center">
          <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center mb-4">
            <IconSymbol name="lock.circle.fill" size={32} color="white" />
          </View>
          <Text className="text-3xl font-bold text-white mb-2">Admin Access</Text>
          <Text className="text-sm text-white/80 text-center">
            Biometric authentication required for Kenneth Uetrecht
          </Text>
        </View>

        {/* Authentication Methods */}
        <View className="px-4 py-6 gap-4">
          {/* Facial Recognition */}
          <TouchableOpacity
            onPress={handleFacialAuth}
            disabled={isAuthenticating}
            className={`bg-surface rounded-lg p-6 border-2 border-border items-center gap-4 ${
              isAuthenticating ? "opacity-50" : ""
            }`}
          >
            <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center">
              <IconSymbol name="faceid" size={28} color="#3B82F6" />
            </View>
            <View className="items-center">
              <Text className="text-lg font-semibold text-foreground">Facial Recognition</Text>
              <Text className="text-sm text-muted text-center">
                Use your face to authenticate
              </Text>
            </View>
            {isAuthenticating && authMethod === "facial" && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </TouchableOpacity>

          {/* Fingerprint */}
          <TouchableOpacity
            onPress={handleFingerprintAuth}
            disabled={isAuthenticating}
            className={`bg-surface rounded-lg p-6 border-2 border-border items-center gap-4 ${
              isAuthenticating ? "opacity-50" : ""
            }`}
          >
            <View className="w-14 h-14 rounded-full bg-purple-100 items-center justify-center">
              <IconSymbol name="touchid" size={28} color="#A855F7" />
            </View>
            <View className="items-center">
              <Text className="text-lg font-semibold text-foreground">Fingerprint</Text>
              <Text className="text-sm text-muted text-center">
                Use your fingerprint to authenticate
              </Text>
            </View>
            {isAuthenticating && authMethod === "fingerprint" && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </TouchableOpacity>

          {/* Backup Code */}
          <View className="bg-surface rounded-lg p-6 border-2 border-border gap-4">
            <View className="flex-row items-center gap-3">
              <View className="w-14 h-14 rounded-full bg-amber-100 items-center justify-center">
                <IconSymbol name="key.fill" size={28} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-foreground">Backup Code</Text>
                <Text className="text-xs text-muted">
                  {biometricAuthService.getRemainingBackupCodes()} codes remaining
                </Text>
              </View>
            </View>
            <TextInput
              placeholder="Enter backup code"
              placeholderTextColor={colors.muted}
              value={backupCode}
              onChangeText={setBackupCode}
              className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
              editable={!isAuthenticating}
            />
            <TouchableOpacity
              onPress={handleBackupCodeAuth}
              disabled={isAuthenticating || !backupCode.trim()}
              className={`bg-primary rounded-lg py-3 items-center ${
                isAuthenticating || !backupCode.trim() ? "opacity-50" : ""
              }`}
            >
              <Text className="text-white font-semibold">Authenticate</Text>
            </TouchableOpacity>
          </View>

          {/* Failed Attempts Warning */}
          {lockoutStatus.attempts > 0 && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-4">
              <View className="flex-row items-start gap-3">
                <IconSymbol name="exclamationmark.circle.fill" size={20} color="#EF4444" />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-red-700">
                    {lockoutStatus.attempts}/{lockoutStatus.maxAttempts} failed attempts
                  </Text>
                  <Text className="text-xs text-red-600 mt-1">
                    Account will lock after {lockoutStatus.maxAttempts - lockoutStatus.attempts} more failed
                    attempts
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Security Info */}
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <View className="flex-row items-start gap-3">
              <IconSymbol name="info.circle.fill" size={20} color="#3B82F6" />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-blue-700 mb-1">
                  Biometric Security
                </Text>
                <Text className="text-xs text-blue-600">
                  Your biometric data is encrypted and stored locally on your device. Only you can
                  access the admin panel.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Result Modal */}
      <Modal visible={showResult} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-surface rounded-2xl p-6 w-full max-w-sm gap-4">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center self-center ${
                authResult?.includes("Welcome") ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <IconSymbol
                name={authResult?.includes("Welcome") ? "checkmark.circle.fill" : "xmark.circle.fill"}
                size={24}
                color={authResult?.includes("Welcome") ? "#10B981" : "#EF4444"}
              />
            </View>
            <Text className="text-lg font-semibold text-foreground text-center">{authResult}</Text>
            <TouchableOpacity
              onPress={() => setShowResult(false)}
              className="bg-primary rounded-lg py-3"
            >
              <Text className="text-white font-semibold text-center">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
