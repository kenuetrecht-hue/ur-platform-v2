import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, HeaderBar, Card } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function VerifyAgeScreen() {
  const colors = useColors();
  const [idUploaded, setIdUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleVerify() {
    if (!idUploaded || !selfieUploaded) {
      Alert.alert("Missing documents", "Please upload your ID and take a selfie to continue.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert("Verified!", "Your age has been verified. Welcome to UR!", [
        { text: "Continue", onPress: () => router.replace("/profile-setup") },
      ]);
    }, 1500);
  }

  return (
    <ScreenContainer>
      <HeaderBar title="Verify Your Age" />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.primary + "20",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSymbol name="shield.fill" size={36} color={colors.primary} />
          </View>
          <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "700", textAlign: "center" }}>
            Age Verification Required
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 22 }}>
            UR is for adults 18+ only. We use secure ID verification to keep our community safe.
          </Text>
        </View>

        <Card>
          <Pressable
            onPress={() => setIdUploaded(true)}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, opacity: pressed ? 0.7 : 1 })}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                backgroundColor: idUploaded ? colors.success + "20" : colors.background,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: idUploaded ? colors.success : colors.border,
              }}
            >
              <IconSymbol name={idUploaded ? "checkmark.circle.fill" : "camera.fill"} size={28} color={idUploaded ? colors.success : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}>
                {idUploaded ? "ID Uploaded" : "Upload Government ID"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                Driver&apos;s license, passport, or state ID
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </Pressable>
        </Card>

        <Card>
          <Pressable
            onPress={() => setSelfieUploaded(true)}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, opacity: pressed ? 0.7 : 1 })}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                backgroundColor: selfieUploaded ? colors.success + "20" : colors.background,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: selfieUploaded ? colors.success : colors.border,
              }}
            >
              <IconSymbol name={selfieUploaded ? "checkmark.circle.fill" : "person.crop.circle"} size={28} color={selfieUploaded ? colors.success : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}>
                {selfieUploaded ? "Selfie Captured" : "Take a Selfie"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                We&apos;ll match it to your ID for verification
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </Pressable>
        </Card>

        <Card style={{ backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <IconSymbol name="lock.fill" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 4 }}>
                Your data is secure
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                Verification is processed by our secure partner. Your ID is encrypted and stored only as long as required by law.
              </Text>
            </View>
          </View>
        </Card>

        <PrimaryButton title="Verify & Continue" size="lg" onPress={handleVerify} loading={loading} />
      </ScrollView>
    </ScreenContainer>
  );
}
