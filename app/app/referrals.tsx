import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Share, Platform, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, HeaderBar, EmptyState } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getUser, getReferrals, ReferralRecord, User } from "@/lib/store";

export default function ReferralsScreen() {
  const colors = useColors();
  const [user, setUser] = useState<User | null>(null);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);

  useFocusEffect(useCallback(() => {
    getUser().then(setUser);
    getReferrals().then(setReferrals);
  }, []));

  const totalEarned = referrals.reduce((sum, r) => sum + r.earned, 0);
  const activeCount = referrals.filter((r) => r.status === "active").length;
  const code = user?.referralCode || "URCREATE";

  async function handleCopy() {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(code);
        alert("Referral code copied!");
        return;
      } catch (e) {}
    }
    Alert.alert("Your referral code", code, [
      { text: "OK" },
      { text: "Share instead", onPress: handleShare },
    ]);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Join me on UR — the new home for creators and their communities. Use my code ${code} to get 50% off your first month! Download: https://ur-app.com/r/${code}`,
      });
    } catch (e) {
      // User cancelled
    }
  }

  return (
    <ScreenContainer>
      <HeaderBar title="Refer Friends" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <LinearGradient
          colors={["#10B981", "#059669"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 24, alignItems: "center", gap: 14 }}
        >
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
            <IconSymbol name="person.2.fill" size={32} color="#FFFFFF" />
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "700" }}>Earn $5 per friend</Text>
            <Text style={{ color: "#FFFFFF", fontSize: 14, opacity: 0.9, textAlign: "center" }}>
              They get 50% off, you earn $5 + 100 points when they subscribe.
            </Text>
          </View>
        </LinearGradient>

        <Card style={{ gap: 14 }}>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "500" }}>Your referral code</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "800", letterSpacing: 2, textAlign: "center" }}>{code}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <IconSymbol name="doc.on.doc" size={16} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>Copy</Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.primary,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <IconSymbol name="square.and.arrow.up" size={16} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>Share</Text>
            </Pressable>
          </View>
        </Card>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Card style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>{referrals.length}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Total invites</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>{activeCount}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Active</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Text style={{ color: colors.success, fontSize: 24, fontWeight: "700" }}>${totalEarned}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Earned</Text>
          </Card>
        </View>

        <View>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700", marginBottom: 12 }}>Your Referrals</Text>
          {referrals.length === 0 ? (
            <EmptyState icon="person.2.fill" title="No referrals yet" message="Share your code to start earning rewards." />
          ) : (
            <View style={{ gap: 8 }}>
              {referrals.map((r) => (
                <View
                  key={r.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: r.status === "active" ? colors.success + "20" : colors.warning + "20", alignItems: "center", justifyContent: "center" }}>
                    <IconSymbol name={r.status === "active" ? "checkmark" : "clock.fill"} size={16} color={r.status === "active" ? colors.success : colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>{r.referredName}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                      {r.date} · {r.status === "active" ? "Active subscriber" : "Pending signup"}
                    </Text>
                  </View>
                  {r.earned > 0 && (
                    <Text style={{ color: colors.success, fontSize: 14, fontWeight: "700" }}>+${r.earned}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
