import { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, HeaderBar, Avatar } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { setOnboarded } from "@/lib/store";

const INTERESTS = ["Fitness", "Music", "Coaching", "Art", "Gaming", "Business", "Lifestyle", "Comedy"];

export default function ProfileSetupScreen() {
  const colors = useColors();
  const [bio, setBio] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [photoIndex] = useState(60);

  function toggleInterest(name: string) {
    setSelectedInterests((prev) => prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]);
  }

  async function handleContinue() {
    await setOnboarded(true);
    router.replace("/onboarding");
  }

  return (
    <ScreenContainer>
      <HeaderBar title="Set Up Your Profile" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", gap: 12 }}>
            <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <View style={{ position: "relative" }}>
                <Avatar uri={`https://i.pravatar.cc/300?img=${photoIndex}`} size={96} />
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    backgroundColor: colors.primary,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: colors.background,
                  }}
                >
                  <IconSymbol name="camera.fill" size={14} color="#FFFFFF" />
                </View>
              </View>
            </Pressable>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Tap to change photo</Text>
          </View>

          <View>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 6 }}>About You (Optional)</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people a bit about yourself..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              maxLength={150}
              textAlignVertical="top"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                color: colors.foreground,
                minHeight: 100,
              }}
            />
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right", marginTop: 4 }}>{bio.length}/150</Text>
          </View>

          <View>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>Interests</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>Pick a few to personalize your feed</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {INTERESTS.map((interest) => {
                const selected = selectedInterests.includes(interest);
                return (
                  <Pressable
                    key={interest}
                    onPress={() => toggleInterest(interest)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 999,
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ color: selected ? "#FFFFFF" : colors.foreground, fontSize: 14, fontWeight: "500" }}>
                      {interest}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <PrimaryButton title="Continue" size="lg" onPress={handleContinue} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
