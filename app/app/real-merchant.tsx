import { useState } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, HeaderBar, PrimaryButton } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { addLead, addPoints } from "@/lib/store";

export default function RealMerchantScreen() {
  const colors = useColors();
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!ownerName.trim() || !businessName.trim() || !phone.trim() || !email.trim()) {
      Alert.alert("Missing info", "Please fill out every field so RMS can reach you.");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      Alert.alert("Invalid phone", "Please enter a valid phone number.");
      return;
    }
    setLoading(true);
    await addLead(
      "Real Merchant Services",
      ownerName.trim(),
      email.trim(),
      businessName.trim(),
      phone.trim(),
    );
    await addPoints(50);
    setLoading(false);
    Alert.alert(
      "Thanks! 🎉",
      "Your info has been received. Real Merchant Services will reach out shortly. You earned 50 loyalty points!",
      [{ text: "Done", onPress: () => router.back() }]
    );
  }

  const benefits = [
    "Lower processing fees designed for creators",
    "Fast next-day deposits",
    "No setup or hidden fees",
    "Dedicated creator support team",
    "Integrates seamlessly with UR earnings",
  ];

  function inputStyle() {
    return {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
      color: colors.foreground,
    } as const;
  }

  return (
    <ScreenContainer>
      <HeaderBar title="" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 20 }}>
        <LinearGradient
          colors={["#10B981", "#059669"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 24, gap: 12 }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
            <IconSymbol name="creditcard.fill" size={28} color="#FFFFFF" />
          </View>
          <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800" }}>Real Merchant Services</Text>
          <Text style={{ color: "#FFFFFF", fontSize: 14, opacity: 0.9, lineHeight: 20 }}>
            Smarter payment processing built for creators. Lower fees, faster payouts, real human support.
          </Text>
        </LinearGradient>

        <Card style={{ gap: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Why creators choose RMS</Text>
          {benefits.map((b) => (
            <View key={b} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
              <Text style={{ flex: 1, color: colors.foreground, fontSize: 14, lineHeight: 20 }}>{b}</Text>
            </View>
          ))}
        </Card>

        <Card style={{ gap: 14 }}>
          <View>
            <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "700" }}>Get a free quote</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
              Tell us about your business. RMS will reach out within 24 hours — no obligation.
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>Full Owner Name</Text>
            <TextInput
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="Jane Doe"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              style={inputStyle()}
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>Business Name</Text>
            <TextInput
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Doe Studios LLC"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              style={inputStyle()}
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>Phone Number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              autoCorrect={false}
              returnKeyType="next"
              style={inputStyle()}
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={inputStyle()}
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: colors.primary + "10", borderRadius: 10 }}>
            <IconSymbol name="sparkles" size={16} color={colors.primary} />
            <Text style={{ flex: 1, color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
              Submit your info and earn <Text style={{ fontWeight: "700" }}>50 loyalty points</Text>!
            </Text>
          </View>

          <PrimaryButton title="Get My Free Quote" icon="paperplane.fill" size="lg" onPress={handleSubmit} loading={loading} />

          <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 16 }}>
            By submitting, you agree to be contacted by Real Merchant Services. UR may receive a commission. See our Privacy Policy.
          </Text>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
