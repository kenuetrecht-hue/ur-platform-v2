import { useState, useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, HeaderBar, TierBadge } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getUser, User, TIERS, pointsToNextTier, TierName } from "@/lib/store";

export default function LoyaltyScreen() {
  const colors = useColors();
  const [user, setUser] = useState<User | null>(null);

  useFocusEffect(useCallback(() => {
    getUser().then(setUser);
  }, []));

  if (!user) return <ScreenContainer><HeaderBar title="Loyalty Rewards" onBack={() => router.back()} /></ScreenContainer>;

  const progress = pointsToNextTier(user.points);
  const tierOrder: TierName[] = ["Bronze", "Silver", "Gold", "Platinum"];

  const earnActions = [
    { icon: "person.2.fill", label: "Refer a friend", points: 100 },
    { icon: "heart.fill", label: "Tip a creator", points: "1 per $1" },
    { icon: "lock.fill", label: "Subscribe to a creator", points: 20 },
    { icon: "bubble.left.fill", label: "Send a message", points: 2 },
    { icon: "checkmark.seal.fill", label: "Follow a creator", points: 5 },
    { icon: "trophy.fill", label: "Enter a contest", points: 10 },
  ];

  return (
    <ScreenContainer>
      <HeaderBar title="Loyalty Rewards" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 24, gap: 16 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: "#FFFFFF", fontSize: 13, opacity: 0.9 }}>Current tier</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "800" }}>{user.tier}</Text>
            </View>
            <IconSymbol name="crown.fill" size={48} color={TIERS[user.tier].color} />
          </View>
          <View>
            <Text style={{ color: "#FFFFFF", fontSize: 14, opacity: 0.9, marginBottom: 6 }}>{user.points} loyalty points</Text>
            {progress.next && (
              <>
                <View style={{ height: 8, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 4, overflow: "hidden" }}>
                  <View style={{ width: `${progress.progress * 100}%`, height: "100%", backgroundColor: "#FFFFFF" }} />
                </View>
                <Text style={{ color: "#FFFFFF", fontSize: 12, opacity: 0.9, marginTop: 6 }}>
                  {progress.needed} points to {progress.next}
                </Text>
              </>
            )}
            {!progress.next && (
              <Text style={{ color: "#FFFFFF", fontSize: 12, opacity: 0.9, marginTop: 6 }}>
                You&apos;ve reached the highest tier! 🎉
              </Text>
            )}
          </View>
        </LinearGradient>

        <View>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700", marginBottom: 12 }}>All Tiers & Perks</Text>
          <View style={{ gap: 10 }}>
            {tierOrder.map((tier) => {
              const t = TIERS[tier];
              const isCurrent = user.tier === tier;
              return (
                <Card key={tier} style={{ borderColor: isCurrent ? t.color : colors.border, borderWidth: isCurrent ? 2 : 1, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <IconSymbol name="crown.fill" size={24} color={t.color} />
                      <View>
                        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>{tier}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>
                          {t.min}{t.max === Infinity ? "+" : `–${t.max}`} points
                        </Text>
                      </View>
                    </View>
                    {isCurrent && <TierBadge tier={tier} size="sm" />}
                  </View>
                  <View style={{ gap: 6, paddingLeft: 4 }}>
                    {t.perks.map((perk) => (
                      <View key={perk} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <IconSymbol name="checkmark.circle.fill" size={14} color={colors.success} />
                        <Text style={{ color: colors.foreground, fontSize: 13 }}>{perk}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700", marginBottom: 12 }}>How to Earn Points</Text>
          <View style={{ gap: 8 }}>
            {earnActions.map((action) => (
              <View
                key={action.label}
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
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name={action.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={{ flex: 1, color: colors.foreground, fontSize: 14, fontWeight: "500" }}>{action.label}</Text>
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>+{action.points}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
