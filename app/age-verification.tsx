import { useState } from "react";
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, HeaderBar, URMark } from "@/components/ur-ui";
import { useColors } from "@/hooks/use-colors";

export default function AgeVerificationScreen() {
  const colors = useColors();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(2000, i).toLocaleString("default", { month: "long" }),
    value: String(i + 1).padStart(2, "0"),
  }));

  const days = Array.from({ length: 31 }, (_, i) => ({
    label: String(i + 1),
    value: String(i + 1).padStart(2, "0"),
  }));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => ({
    label: String(currentYear - i),
    value: String(currentYear - i),
  }));

  function calculateAge(month: string, day: string, year: string): number {
    const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  function handleVerifyAge() {
    if (!selectedMonth || !selectedDay || !selectedYear) {
      Alert.alert("Incomplete Date", "Please select your complete birth date.");
      return;
    }

    const age = calculateAge(selectedMonth, selectedDay, selectedYear);

    // STRICT 18+ REQUIREMENT - No exceptions
    if (age < 18) {
      Alert.alert(
        "Age Restriction",
        "You must be at least 18 years old to use UR. This is a premium creator platform for adults only.",
        [{ text: "OK", onPress: () => router.back() }]
      );
      return;
    }

    // Proceed to mandatory ID verification (front and back)
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Route to KYC ID verification with front and back ID upload
      router.replace("/kyc-id-verification");
    }, 600);
  }

  return (
    <ScreenContainer>
      <HeaderBar title="Age Verification" onBack={() => router.back()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginVertical: 16, gap: 12 }}>
            <URMark size={64} />
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>18+ Verification Required</Text>
            <Text style={{ color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 22 }}>
              UR is a premium creator platform for adults only. You must be at least 18 years old to proceed.
            </Text>
          </View>

          {/* Age Requirement Notice */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>18+ Age Requirement</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              UR LLC requires all users to be 18 years or older. This is a strict requirement for legal compliance and user safety. You will need to verify your age with a government-issued ID and facial recognition before account creation.
            </Text>
          </View>

          {/* Birth Date Selection */}
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>Enter Your Birth Date</Text>

            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* Month Picker */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>Month</Text>
                <Pressable
                  style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: selectedMonth ? colors.primary : colors.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  })}
                  onPress={() => {
                    // In a real app, use a date picker modal
                    const randomMonth = months[Math.floor(Math.random() * months.length)];
                    setSelectedMonth(randomMonth.value);
                  }}
                >
                  <Text style={{ color: selectedMonth ? colors.foreground : colors.muted, fontSize: 14 }}>
                    {selectedMonth ? months.find((m) => m.value === selectedMonth)?.label : "Select"}
                  </Text>
                </Pressable>
              </View>

              {/* Day Picker */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>Day</Text>
                <Pressable
                  style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: selectedDay ? colors.primary : colors.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  })}
                  onPress={() => {
                    const randomDay = days[Math.floor(Math.random() * days.length)];
                    setSelectedDay(randomDay.value);
                  }}
                >
                  <Text style={{ color: selectedDay ? colors.foreground : colors.muted, fontSize: 14 }}>
                    {selectedDay || "Select"}
                  </Text>
                </Pressable>
              </View>

              {/* Year Picker */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>Year</Text>
                <Pressable
                  style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: selectedYear ? colors.primary : colors.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  })}
                  onPress={() => {
                    const randomYear = years[Math.floor(Math.random() * years.length)];
                    setSelectedYear(randomYear.value);
                  }}
                >
                  <Text style={{ color: selectedYear ? colors.foreground : colors.muted, fontSize: 14 }}>
                    {selectedYear || "Select"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Verification Process Notice */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>Next: ID Verification</Text>
            <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
              After confirming your age, you will need to upload:
            </Text>
            <View style={{ gap: 8, marginLeft: 12 }}>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                • Front of government-issued ID (passport, driver&apos;s license, or national ID)
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                • Back of government-issued ID
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                • Selfie for facial recognition matching
              </Text>
            </View>
          </View>

          {/* Privacy Notice */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>Privacy & Security</Text>
            <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
              Your birth date is used solely for age verification and is not stored permanently. All ID documents and facial data are encrypted and securely stored in compliance with privacy regulations.
            </Text>
          </View>

          <PrimaryButton
            title="Verify Age & Continue"
            size="lg"
            onPress={handleVerifyAge}
            loading={loading}
          />

          <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 16 }}>
            By verifying your age, you confirm that you are at least 18 years old and eligible to use UR.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
