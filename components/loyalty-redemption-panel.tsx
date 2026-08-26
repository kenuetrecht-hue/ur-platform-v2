import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type { LoyaltyRedemptionId } from "@/lib/loyalty-program-config";

type Props = {
  balance: number;
  defaultCreatorId?: string;
};

export function LoyaltyRedemptionPanel({ balance, defaultCreatorId = "ai-wellness-001" }: Props) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const program = trpc.loyalty.getProgram.useQuery();
  const [selectedCreator] = useState(defaultCreatorId);

  const redeem = trpc.loyalty.redeem.useMutation({
    onSuccess: () => {
      void utils.loyalty.getStatus.invalidate();
      void utils.loyalty.getDashboard.invalidate();
      void utils.usageCredits.getMyBalances.invalidate();
      void utils.usageCredits.getMyTracker.invalidate();
      void utils.aiTalk.getStatus.invalidate();
    },
  });

  const catalog = program.data?.redemptionCatalog ?? [];

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 14 }}>
        Redeem points
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
        Points are free — redemptions cost more than paying cash so we stay profitable. Paid plans
        always give more for less.
      </Text>

      {catalog.map((offer) => {
        const needsCreator = Boolean(offer.freeTextMessages);
        const canAfford = balance >= offer.pointsCost;
        return (
          <View
            key={offer.id}
            style={[styles.row, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
                {offer.label}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 10, marginTop: 3, lineHeight: 14 }}>
                You get: {offer.youReceive}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 9, marginTop: 2 }}>
                {offer.valueNote}
              </Text>
            </View>
            <Pressable
              disabled={!canAfford || redeem.isPending}
              onPress={() =>
                redeem.mutate({
                  rewardId: offer.id as LoyaltyRedemptionId,
                  creatorId: needsCreator ? selectedCreator : undefined,
                })
              }
              style={[
                styles.btn,
                {
                  backgroundColor: canAfford ? colors.primary : colors.border,
                  opacity: redeem.isPending ? 0.7 : 1,
                },
              ]}
            >
              {redeem.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>
                  {offer.pointsCost.toLocaleString()} LP
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}

      {redeem.isSuccess ? (
        <Text style={{ color: colors.primary, fontSize: 11, marginTop: 8 }}>
          Redeemed — {redeem.data?.youReceive}
        </Text>
      ) : null}
      {redeem.error ? (
        <Text style={{ color: "#c55", fontSize: 11, marginTop: 8 }}>{redeem.error.message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 10,
  },
  btn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: "center",
  },
});
