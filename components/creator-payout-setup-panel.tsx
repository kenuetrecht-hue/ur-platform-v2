import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function CreatorPayoutSetupPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [upholdEmail, setUpholdEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [mode, setMode] = useState<"uphold" | "wallet">("uphold");

  const payout = trpc.partnerDashboard.payoutDashboard.useQuery();
  const upholdUrl = trpc.partnerDashboard.upholdConnectUrl.useQuery(undefined, {
    enabled: payout.data?.enrolled === true,
  });

  const connectUphold = trpc.partnerDashboard.connectUphold.useMutation({
    onSuccess: () => {
      setUpholdEmail("");
      void utils.partnerDashboard.payoutDashboard.invalidate();
      void utils.partnerDashboard.creatorDashboard.invalidate();
    },
  });
  const connectWallet = trpc.partnerDashboard.connectCryptoWallet.useMutation({
    onSuccess: () => {
      setWalletAddress("");
      void utils.partnerDashboard.payoutDashboard.invalidate();
      void utils.partnerDashboard.creatorDashboard.invalidate();
    },
  });

  if (payout.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />;
  }

  if (!payout.data?.enrolled) {
    return null;
  }

  const p = payout.data.payout;

  if (p.status === "connected") {
    return (
      <View style={[styles.card, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>
          ⚡ Instant payouts active
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          You receive {payout.data.creatorSharePercent}% of each sale via{" "}
          {p.method === "uphold" ? `Uphold (${p.upholdEmail})` : `USDC wallet`} — typically within
          seconds on the blockchain.
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 12, marginTop: 4 }}>
          Total paid out: ${(p.totalPaidOutCents / 100).toFixed(2)}
          {p.pendingBalanceCents > 0
            ? ` · Pending: $${(p.pendingBalanceCents / 100).toFixed(2)}`
            : ""}
        </Text>
        {payout.data.recentPayouts.slice(0, 3).map((tx) => (
          <Text key={tx.id} style={{ color: colors.muted, fontSize: 11 }}>
            ✓ ${(tx.netCents / 100).toFixed(2)} {tx.asset} — {tx.message}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>
        💰 Set up instant payouts (Uphold / blockchain)
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
        {payout.data.setupMessage} You keep {payout.data.creatorSharePercent}% of every class sale.
      </Text>

      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setMode("uphold")}
          style={[styles.tab, { backgroundColor: mode === "uphold" ? colors.primary : colors.background }]}
        >
          <Text style={{ color: mode === "uphold" ? "#fff" : colors.foreground, fontWeight: "700" }}>
            Uphold
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("wallet")}
          style={[styles.tab, { backgroundColor: mode === "wallet" ? colors.primary : colors.background }]}
        >
          <Text style={{ color: mode === "wallet" ? "#fff" : colors.foreground, fontWeight: "700" }}>
            USDC wallet
          </Text>
        </Pressable>
      </View>

      {mode === "uphold" ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{upholdUrl.data?.message}</Text>
          <Pressable
            onPress={() => upholdUrl.data?.url && Linking.openURL(upholdUrl.data.url)}
            style={[styles.btn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.btnText}>
              {upholdUrl.data?.mode === "oauth" ? "Connect Uphold account" : "Create Uphold account"}
            </Text>
          </Pressable>
          <TextInput
            value={upholdEmail}
            onChangeText={setUpholdEmail}
            placeholder="Your Uphold email after signing up"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable
            disabled={!upholdEmail.trim() || connectUphold.isPending}
            onPress={() => connectUphold.mutate({ upholdEmail: upholdEmail.trim() })}
            style={[styles.btn, { backgroundColor: colors.primary, opacity: !upholdEmail.trim() ? 0.5 : 1 }]}
          >
            {connectUphold.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Link Uphold for instant USDC</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Paste your USDC wallet address (Polygon/Ethereum) for direct blockchain payouts.
          </Text>
          <TextInput
            value={walletAddress}
            onChangeText={setWalletAddress}
            placeholder="0x… or Solana address"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable
            disabled={walletAddress.trim().length < 20 || connectWallet.isPending}
            onPress={() => connectWallet.mutate({ walletAddress: walletAddress.trim(), asset: "USDC" })}
            style={[
              styles.btn,
              { backgroundColor: colors.primary, opacity: walletAddress.trim().length < 20 ? 0.5 : 1 },
            ]}
          >
            {connectWallet.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Connect wallet</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  tabRow: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, borderRadius: 8, padding: 10, alignItems: "center" },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  btn: { borderRadius: 10, padding: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});
