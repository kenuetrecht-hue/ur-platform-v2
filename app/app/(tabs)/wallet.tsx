import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert , Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, SectionHeader, PrimaryButton, SecondaryButton, EmptyState } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { Transaction, getTransactions, getUser, addTransaction, User, pickPartnerForSlot, recordPartnerClick, Partner } from "@/lib/store";

export default function WalletScreen() {
  const colors = useColors();
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);

  const load = useCallback(async () => {
    const [u, t, p] = await Promise.all([
      getUser(),
      getTransactions(),
      pickPartnerForSlot("wallet_tools"),
    ]);
    setUser(u);
    setTransactions(t);
    setPartner(p);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleTopUp() {
    Alert.alert("Top Up Wallet", "Add funds to your UR wallet", [
      { text: "Cancel", style: "cancel" },
      { text: "$10", onPress: () => doTopUp(10) },
      { text: "$25", onPress: () => doTopUp(25) },
      { text: "$50", onPress: () => doTopUp(50) },
    ]);
  }

  async function doTopUp(amount: number) {
    await addTransaction({
      type: "deposit",
      amount,
      description: `Wallet top-up - $${amount}`,
    });
    await load();
    Alert.alert("Success!", `$${amount} added to your wallet.`);
  }

  function handleWithdraw() {
    Alert.alert("Withdraw", "Withdrawals require a connected bank account. Set this up in Settings.");
  }

  const monthSpent = transactions
    .filter((t) => t.amount < 0 && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 }}>Wallet</Text>
        </View>

        {/* Balance Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 24, gap: 20 }}
          >
            <View>
              <Text style={{ color: "#FFFFFF", fontSize: 14, opacity: 0.9 }}>Available Balance</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 44, fontWeight: "800", marginTop: 4 }}>
                ${(user?.balance || 0).toFixed(2)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={handleTopUp}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <IconSymbol name="plus" size={18} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>Top Up</Text>
              </Pressable>
              <Pressable
                onPress={handleWithdraw}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <IconSymbol name="arrow.up" size={18} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>Withdraw</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* Stats */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Card style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>This Month</Text>
              <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "700" }}>${monthSpent.toFixed(2)}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>spent supporting creators</Text>
            </Card>
            <Card style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>Total</Text>
              <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "700" }}>{transactions.length}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>transactions to date</Text>
            </Card>
          </View>
        </View>

        {/* Transactions */}
        <View style={{ paddingHorizontal: 20 }}>
          <SectionHeader title="Recent Activity" />
          {transactions.length === 0 ? (
            <EmptyState icon="creditcard.fill" title="No transactions yet" message="Your transaction history will appear here." />
          ) : (
            <View style={{ gap: 8 }}>
              {transactions.map((tx) => (
                <View
                  key={tx.id}
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
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: tx.amount > 0 ? colors.success + "20" : colors.primary + "15",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol
                      name={tx.type === "deposit" ? "arrow.down" : tx.type === "tip" ? "heart.fill" : tx.type === "subscription" ? "checkmark.seal.fill" : "arrow.up"}
                      size={18}
                      color={tx.amount > 0 ? colors.success : colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>{tx.description}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{tx.date}</Text>
                  </View>
                  <Text style={{ color: tx.amount > 0 ? colors.success : colors.foreground, fontSize: 15, fontWeight: "700" }}>
                    {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {partner && (
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 }}>TOOLS FOR CREATORS</Text>
            <Pressable
              onPress={async () => {
                await recordPartnerClick(partner.id);
                Linking.openURL(partner.url).catch(() => {});
              }}
              style={({ pressed }) => ({
                borderRadius: 14,
                padding: 14,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" }}>
                <IconSymbol name="creditcard.fill" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>{partner.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{partner.tagline}</Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
