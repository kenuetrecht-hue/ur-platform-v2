import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LETTERING_ON_COLOR, LETTERING_ON_WHITE } from "@/lib/gold-lettering";

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
  onWash = false,
}: {
  transactions: Tx[];
  emptyMessage?: string;
  /** Gold lettering on the blue page. White cards keep purplish-blue ink. */
  onWash?: boolean;
}) {
  const colors = useColors();
  const ink = onWash ? LETTERING_ON_COLOR : LETTERING_ON_WHITE;
  const sub = onWash ? LETTERING_ON_COLOR : LETTERING_ON_WHITE;
  const amount = onWash ? LETTERING_ON_COLOR : LETTERING_ON_WHITE;

  if (transactions.length === 0) {
    return <Text style={{ color: sub, fontSize: 13 }}>{emptyMessage}</Text>;
  }

  return (
    <View style={{ gap: 8 }}>
      {transactions.map((tx) => (
        <View
          key={tx.id}
          style={[
            styles.row,
            {
              borderColor: colors.border,
              backgroundColor: onWash ? "transparent" : "#FFFFFF",
            },
          ]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: ink, fontWeight: "600", fontSize: 13 }}>
              {tx.description}
            </Text>
            <Text style={{ color: sub, fontSize: 11 }}>
              {tx.createdAtLabel} · {tx.type.replace(/_/g, " ")} · {tx.status}
              {tx.attributionSlug ? ` · via ${tx.attributionSlug}` : ""}
            </Text>
          </View>
          <Text style={{ color: amount, fontWeight: "800", fontSize: 14 }}>
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
  return (
    <View style={[styles.linkCard, { borderColor: "#E0E7FF", backgroundColor: "#FFFFFF" }]}>
      <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 14 }}>{label}</Text>
      <Text style={{ color: LETTERING_ON_WHITE, fontSize: 11 }}>Slug: {slug}</Text>
      <Text
        selectable
        style={{
          color: LETTERING_ON_WHITE,
          fontSize: 12,
          fontFamily: "monospace",
          marginTop: 6,
        }}
      >
        {customUrl}
      </Text>
      <Text style={{ color: LETTERING_ON_WHITE, fontSize: 11, marginTop: 6 }}>
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
