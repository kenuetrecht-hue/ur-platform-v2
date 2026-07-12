import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, TextInput } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Avatar, HeaderBar, PrimaryButton, Card } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { Creator, getCreator, getUser, addTransaction, addPoints } from "@/lib/store";

const TIP_AMOUNTS = [1, 5, 10, 25, 50, 100];

export default function TipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [amount, setAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (id) getCreator(id).then((c) => c && setCreator(c));
    getUser().then((u) => setBalance(u.balance));
  }, [id]);

  const finalAmount = customAmount ? parseFloat(customAmount) || 0 : amount;
  const creatorReceives = (finalAmount * 0.85).toFixed(2);
  const platformFee = (finalAmount * 0.15).toFixed(2);

  async function handleSend() {
    if (!creator) return;
    if (finalAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a tip amount greater than $0.");
      return;
    }
    if (finalAmount > balance) {
      Alert.alert("Insufficient balance", "Top up your wallet to send this tip.", [
        { text: "Cancel" },
        { text: "Top Up", onPress: () => router.replace("/(tabs)/wallet") },
      ]);
      return;
    }
    setLoading(true);
    await addTransaction({
      type: "tip",
      amount: -finalAmount,
      description: `Tip to ${creator.name}${note ? ` - "${note}"` : ""}`,
      creatorId: creator.id,
      creatorName: creator.name,
    });
    await addPoints(Math.floor(finalAmount));
    setLoading(false);
    Alert.alert(
      "Tip sent! 🎉",
      `${creator.name} received $${creatorReceives}. You earned ${Math.floor(finalAmount)} loyalty points!`,
      [{ text: "Done", onPress: () => router.back() }]
    );
  }

  if (!creator) return <ScreenContainer><HeaderBar title="" onBack={() => router.back()} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <HeaderBar title="Send a Tip" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Card style={{ alignItems: "center", gap: 12, padding: 24 }}>
          <Avatar uri={creator.photo} size={80} ring />
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>{creator.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>Show your support with a tip</Text>
        </Card>

        <View>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 10 }}>Quick amounts</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TIP_AMOUNTS.map((a) => {
              const selected = amount === a && !customAmount;
              return (
                <Pressable
                  key={a}
                  onPress={() => { setAmount(a); setCustomAmount(""); }}
                  style={({ pressed }) => ({
                    width: "31%",
                    paddingVertical: 16,
                    borderRadius: 12,
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: selected ? "#FFFFFF" : colors.foreground, fontSize: 18, fontWeight: "700" }}>${a}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 6 }}>Custom amount</Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "600" }}>$</Text>
            <TextInput
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={{ flex: 1, padding: 14, fontSize: 18, color: colors.foreground, fontWeight: "600" }}
            />
          </View>
        </View>

        <View>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 6 }}>Add a note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Loved your latest post!"
            placeholderTextColor={colors.muted}
            maxLength={100}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: colors.foreground,
            }}
          />
        </View>

        <Card style={{ gap: 8, backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Tip amount</Text>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>${finalAmount.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{creator.name} receives (85%)</Text>
            <Text style={{ color: colors.success, fontSize: 13, fontWeight: "600" }}>${creatorReceives}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Platform fee (15%)</Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>${platformFee}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>You earn</Text>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>{Math.floor(finalAmount)} pts</Text>
          </View>
        </Card>

        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>
          Wallet balance: ${balance.toFixed(2)}
        </Text>

        <PrimaryButton title={`Send $${finalAmount.toFixed(2)} Tip`} icon="heart.fill" size="lg" onPress={handleSend} loading={loading} />
      </ScrollView>
    </ScreenContainer>
  );
}
