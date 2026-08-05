import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

type Tx = {
  id: string;
  type: string;
  description: string;
  amountUsd: string;
  status: string;
  createdAtLabel: string;
  attributionSlug?: string;
};

export function TransactionHistoryList({
  transactions,
  emptyMessage = "No transactions yet.",
}: {
  transactions: Tx[];
  emptyMessage?: string;
}) {
  const colors = useColors();

  if (transactions.length === 0) {
    return <Text style={{ color: colors.muted, fontSize: 13 }}>{emptyMessage}</Text>;
  }

  return (
    <View style={{ gap: 8 }}>
      {transactions.map((tx) => (
        <View
          key={tx.id}
          style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>
              {tx.description}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              {tx.createdAtLabel} · {tx.type.replace(/_/g, " ")} · {tx.status}
              {tx.attributionSlug ? ` · via ${tx.attributionSlug}` : ""}
            </Text>
          </View>
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 14 }}>
            ${tx.amountUsd}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function CustomLinkCard({
  customUrl,
  slug,
  label = "Your custom link",
}: {
  customUrl: string;
  slug: string;
  label?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.linkCard, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.muted, fontSize: 11 }}>Slug: {slug}</Text>
      <Text
        selectable
        style={{
          color: colors.primary,
          fontSize: 12,
          fontFamily: "monospace",
          marginTop: 6,
        }}
      >
        {customUrl}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
        Long-press to copy. Every visit and sale through this link is tracked.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  linkCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
});
