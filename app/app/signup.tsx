import { useState } from "react";
import { View, Text, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable, ViewStyle } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, HeaderBar, URMark } from "@/components/ur-ui";
import { WarningBanner } from "@/components/warning-banner";
import { LaunchPromotionBanner } from "@/components/launch-promotion-banner";
import { useColors } from "@/hooks/use-colors";

export default function SignupScreen() {
  const colors = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing info", "Please fill out all fields to continue.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password too short", "Please use at least 6 characters.");
      return;
    }
    if (!hasAcceptedTerms) {
      Alert.alert("Terms Required", "Please accept the Terms of Use, Rules, & Regulations to continue.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace("/verify-age");
    }, 600);
  }

  return (
    <ScreenContainer>
      <WarningBanner />
      <LaunchPromotionBanner tier="tier_1" discount={50} durationDays={180} lifetimeEntries={2} />
      <HeaderBar title="Create Account" onBack={() => router.back()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginVertical: 16, gap: 12 }}>
            <URMark size={64} />
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>Join UR</Text>
            <Text style={{ color: colors.muted, fontSize: 15, textAlign: "center" }}>
              Create your account in 30 seconds
            </Text>
          </View>

          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 6 }}>Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: colors.foreground,
                }}
              />
            </View>

            <View>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 6 }}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: colors.foreground,
                }}
              />
            </View>

            <View>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 6 }}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.muted}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: colors.foreground,
                }}
              />
            </View>
          </View>

          {/* Terms and Conditions Checkbox */}
          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 8, paddingHorizontal: 4 }}>
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
                Terms of Use, Rules, & Regulations
              </Text>
            </Text>
          </View>

          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
            By creating an account, you agree to UR&apos;s Terms of Service and Privacy Policy. You confirm you are 18 years of age or older.
          </Text>

          <View style={{ opacity: hasAcceptedTerms ? 1 : 0.5 }}>
            <PrimaryButton
              title="Create My Free Account"
              size="lg"
              onPress={handleSignup}
              loading={loading}
              disabled={!hasAcceptedTerms}
            />
          </View>

          <Pressable onPress={() => router.replace("/login")} style={({ pressed }) => ({ alignItems: "center", paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              Already have an account? <Text style={{ color: colors.primary, fontWeight: "600" }}>Log in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
