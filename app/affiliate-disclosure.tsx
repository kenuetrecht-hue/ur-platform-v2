import { useState } from "react";
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, HeaderBar, URMark } from "@/components/ur-ui";
import { useColors } from "@/hooks/use-colors";

export default function AffiliateDisclosureScreen() {
  const colors = useColors();
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleAcknowledge() {
    if (!hasAcknowledged) {
      Alert.alert("Acknowledgment Required", "Please acknowledge the affiliate disclosure to continue.");
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
      <HeaderBar title="Affiliate Disclosure" onBack={() => router.back()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginVertical: 16, gap: 12 }}>
            <URMark size={64} />
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>FTC Affiliate Disclosure</Text>
            <Text style={{ color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 22 }}>
              Transparency about commercial relationships and affiliate partnerships
            </Text>
          </View>

          {/* FTC Compliance Notice */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>FTC Endorsement & Affiliate Disclosure</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
              Pursuant to FTC Guides Concerning the Use of Endorsements and Testimonials in Advertising, UR LLC discloses that this application incorporates systemic programmatic affiliate hyperlinks, tracking mechanisms, and product checkout modules tied directly to retail systems.
            </Text>
          </View>

          {/* Affiliate Programs */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Affiliate Partners</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
              UR LLC participates in the following affiliate programs:
            </Text>
            <View style={{ paddingLeft: 16, gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>Amazon Associates</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                  We earn commissions on qualifying purchases made through Amazon links.
                </Text>
              </View>
              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>Walmart Affiliate Program</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                  We earn commissions on qualifying purchases made through Walmart links.
                </Text>
              </View>
            </View>
          </View>

          {/* How It Works */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>How Affiliate Links Work</Text>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700" }}>Recommendations:</Text> Automated conversations, curated dashboards, and product recommendations may include affiliate links.
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700" }}>Tracking:</Text> When you click an affiliate link and make a purchase, we may earn a commission at no additional cost to you.
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700" }}>Transparency:</Text> Affiliate links are marked with a &quot;Sponsored&quot; or &quot;Affiliate Link&quot; label where applicable.
              </Text>
            </View>
          </View>

          {/* Commercial Intent */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Commercial Intent</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
              The presence of premium subscription frameworks ($4.99/month) does not alter, diminish, or extinguish the commercial nature of recommended purchase points. All recommendations are made in good faith, but we have a financial interest in affiliate links.
            </Text>
          </View>

          {/* Your Rights */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Your Rights</Text>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700" }}>No Obligation:</Text> You are never required to click affiliate links or make purchases.
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700" }}>Same Price:</Text> You pay the same price whether you click an affiliate link or go directly to the retailer.
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700" }}>Opt Out:</Text> You can disable affiliate links in your account settings at any time.
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
              I understand that UR uses affiliate links and earns commissions from qualifying purchases.
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
            For more information about our affiliate practices, see our full Terms of Service.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
