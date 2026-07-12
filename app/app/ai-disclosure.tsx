import { useState } from "react";
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, HeaderBar, URMark } from "@/components/ur-ui";
import { useColors } from "@/hooks/use-colors";

export default function AIDisclosureScreen() {
  const colors = useColors();
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleAcknowledge() {
    if (!hasAcknowledged) {
      Alert.alert("Acknowledgment Required", "Please acknowledge the AI disclosure to continue.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.back();
    }, 600);
  }

  return (
    <ScreenContainer>
      <HeaderBar title="AI Features Disclosure" onBack={() => router.back()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginVertical: 16, gap: 12 }}>
            <URMark size={64} />
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>AI Features Disclosure</Text>
            <Text style={{ color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 22 }}>
              Important information about synthetic personas and AI-powered features
            </Text>
          </View>

          {/* Synthetic Persona Notice */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Synthetic Personas & AI Models</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
              Various interactive personas, including &quot;Aura&quot; and other AI assistants, operate entirely as synthetic computer models generated via Large Language Model (LLM) APIs. All textual output, recommendations, checklists, and conversational responses are generated autonomously by software algorithms.
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: "700" }}>
              These are not human interactions and should not be treated as such.
            </Text>
          </View>

          {/* Medical Disclaimer */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Medical & Clinical Disclaimer</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
              <Text style={{ fontWeight: "700" }}>IMPORTANT:</Text> AI outputs are provided strictly for generalized educational, organizational, and recreational purposes only. No behavioral guidance, responses, tracking metrics, or textual interactions shall be construed, interpreted, or relied upon as:
            </Text>
            <View style={{ paddingLeft: 16, gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>• Valid clinical diagnosis or medical evaluation</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>• Formal psychiatric care or mental health treatment</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>• Medical prescriptions or pharmaceutical advice</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>• Professional counseling or therapeutic intervention</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>• Replacement for licensed healthcare providers</Text>
            </View>
          </View>

          {/* Liability Limitation */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Limitation of Liability</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
              UR LLC maintains zero responsibility for errors, omissions, factual inaccuracies, or hallucinations introduced by artificial intelligence pipelines. Users engage with automated bots entirely at their own risk and assume full personal liability for verifying the safety and efficacy of external recommendations.
            </Text>
          </View>

          {/* User Responsibility */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Your Responsibility</Text>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700" }}>Verify Information:</Text> Always verify AI recommendations with authoritative sources before acting on them.
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700" }}>Seek Professional Advice:</Text> For medical, legal, or financial matters, consult qualified professionals.
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700" }}>Report Issues:</Text> If you encounter harmful or inaccurate AI output, report it immediately to our support team.
              </Text>
            </View>
          </View>

          {/* Acknowledgment Checkbox */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() => setHasAcknowledged(!hasAcknowledged)}
              style={({ pressed }) => ({
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: hasAcknowledged ? colors.primary : colors.border,
                backgroundColor: hasAcknowledged ? colors.primary : "transparent",
                justifyContent: "center",
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {hasAcknowledged && (
                <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>✓</Text>
              )}
            </Pressable>
            <Text style={{ color: colors.foreground, fontSize: 13, flex: 1, lineHeight: 18 }}>
              I understand that AI features are for educational and recreational purposes only and are not medical, legal, or professional advice.
            </Text>
          </View>

          <PrimaryButton
            title="I Acknowledge & Continue"
            size="lg"
            onPress={handleAcknowledge}
            loading={loading}
            disabled={!hasAcknowledged}
            style={{ opacity: hasAcknowledged ? 1 : 0.5 }}
          />

          <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 16 }}>
            For more information, please review our full Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
