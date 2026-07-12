import { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Avatar, HeaderBar, PrimaryButton, Card } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { Creator, getCreator, addTransaction, addPoints, getUser } from "@/lib/store";

export default function JoinChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (id) getCreator(id).then((c) => c && setCreator(c));
    getUser().then((u) => setBalance(u.balance));
  }, [id]);

  if (!creator) return <ScreenContainer><HeaderBar title="" onBack={() => router.back()} /></ScreenContainer>;

  const benefits = [
    "Unlimited messages with " + creator.name.split(" ")[0],
    "Access to exclusive content & posts",
    "Priority response within 24 hours",
    "Member-only contests and giveaways",
    "Cancel anytime, no commitment",
  ];

  async function handleJoin() {
    if (!creator) return;
    if (creator.monthlyPrice > balance) {
      Alert.alert("Insufficient balance", "Top up your wallet to join this paid chat.", [
        { text: "Cancel" },
        { text: "Top Up", onPress: () => router.replace("/(tabs)/wallet") },
      ]);
      return;
    }
    setLoading(true);
    await addTransaction({
      type: "subscription",
      amount: -creator.monthlyPrice,
      description: `Monthly chat - ${creator.name}`,
      creatorId: creator.id,
      creatorName: creator.name,
    });
    await addPoints(20);
    setLoading(false);
    Alert.alert(
      "You're in! 🎉",
      `Welcome to ${creator.name}'s private chat. You earned 20 loyalty points.`,
      [{ text: "Open Chat", onPress: () => router.replace(`/chat/conv1` as any) }]
    );
  }

  return (
    <ScreenContainer>
      <HeaderBar title="Join Private Chat" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Card style={{ alignItems: "center", padding: 24, gap: 12 }}>
          <Avatar uri={creator.photo} size={88} ring />
          <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "700" }}>{creator.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>{creator.bio}</Text>
        </Card>

        <Card style={{ gap: 16 }}>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: colors.foreground, fontSize: 36, fontWeight: "800" }}>${creator.monthlyPrice}<Text style={{ fontSize: 16, color: colors.muted, fontWeight: "400" }}>/month</Text></Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Cancel anytime</Text>
          </View>

          <View style={{ height: 1, backgroundColor: colors.border }} />

          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}>What you get:</Text>
            {benefits.map((b) => (
              <View key={b} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
                <Text style={{ flex: 1, color: colors.foreground, fontSize: 14, lineHeight: 20 }}>{b}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={{ backgroundColor: colors.primary + "10", borderColor: colors.primary + "30", flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <IconSymbol name="sparkles" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 4 }}>Earn 20 loyalty points</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Plus monthly bonus points for being a paid member.</Text>
          </View>
        </Card>

        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
          Wallet balance: ${balance.toFixed(2)}{"\n"}
          Of every $1, {creator.name.split(" ")[0]} keeps 85¢. Platform fee 15¢.
        </Text>

        <PrimaryButton title={`Join for $${creator.monthlyPrice}/month`} icon="lock.fill" size="lg" onPress={handleJoin} loading={loading} />
      </ScrollView>
    </ScreenContainer>
  );
}
