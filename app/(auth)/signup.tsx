import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Link } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { SIGNUP_PAGE_WHY } from "@/lib/signup-step-copy";
import { FinishAccountAfterIdPass } from "@/components/finish-account-after-id-pass";

/** Same path as login: name / email / password first, then pictures, then enter. */
export default function SignUpScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
        keyboardShouldPersistTaps="always"
      >
        <View style={{ gap: 16, width: "100%", maxWidth: 420, alignSelf: "center" }}>
          <Link href="/welcome" style={{ color: colors.muted, fontSize: 13 }}>
            ← Back to homepage
          </Link>
          <Text style={{ fontSize: 32, fontWeight: "bold", color: colors.foreground }}>UR Platform</Text>
          <Text style={{ fontSize: 16, color: colors.muted }}>Create your account</Text>
          <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19 }}>{SIGNUP_PAGE_WHY}</Text>
          <FinishAccountAfterIdPass />
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>
            Already have an account? Use Sign in and enter on this same page.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
