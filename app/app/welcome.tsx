import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, URMark } from "@/components/ur-ui";
import { WarningBanner } from "@/components/warning-banner";
import { LaunchPromotionBanner } from "@/components/launch-promotion-banner";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function WelcomeScreen() {
  const colors = useColors();

  const features = [
    { icon: "bubble.left.fill", title: "Real Connections", desc: "Chat directly with creators you love" },
    { icon: "dollarsign.circle.fill", title: "Fair Earnings", desc: "Creators keep 85% of every transaction" },
    { icon: "sparkles", title: "Loyalty Rewards", desc: "Earn points and unlock exclusive perks" },
    { icon: "shield.fill", title: "Safe & Verified", desc: "18+ verified community, clean content" },
  ];

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <WarningBanner />
      <LaunchPromotionBanner tier="tier_1" discount={50} durationDays={180} lifetimeEntries={2} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16 }}>
        <View style={{ flex: 1, justifyContent: "space-between", gap: 32 }}>
          <View style={{ alignItems: "center", marginTop: 32, gap: 24 }}>
            <URMark size={96} />
            <View style={{ alignItems: "center", gap: 12 }}>
              <Text style={{ color: colors.foreground, fontSize: 40, fontWeight: "800", letterSpacing: -1 }}>
                Welcome to UR
              </Text>
              <Text style={{ color: colors.muted, fontSize: 16, textAlign: "center", lineHeight: 24 }}>
                UR a space for all creators. Whether you share art, life, or your mental health journey, UR welcome here.
              </Text>
            </View>
          </View>

          <View style={{ gap: 16 }}>
            {features.map((f) => (
              <View
                key={f.title}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  padding: 16,
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primary + "80"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <IconSymbol name={f.icon as any} size={24} color="white" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", marginBottom: 4 }}>
                    {f.title}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
                    {f.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ gap: 12 }}>
            <PrimaryButton
              title="Create Account"
              size="lg"
              onPress={() => router.push("/signup")}
            />
            <Pressable
              onPress={() => router.push("/login")}
              style={({ pressed }: { pressed: boolean }) => ({
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "700" }}>
                Sign In
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
