import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  AI_TALK_EXPIRY_PURCHASE_DISCLOSURE,
  AI_TALK_EXPIRY_TRACKER_HEADLINE,
  type TalkLotTrackerView,
} from "@/lib/ai-talk-time-policy";
import { AiTalkLowBalanceNotice } from "@/components/ai-talk-low-balance-notice";

type Props = {
  lots: TalkLotTrackerView[];
  totalRemainingDisplay?: string;
  totalRemainingVerbose?: string;
  millisecondsRemaining?: number;
  onReUp?: () => void;
  compact?: boolean;
};

export function AiTalkTimeTracker({
  lots,
  totalRemainingDisplay,
  totalRemainingVerbose,
  millisecondsRemaining,
  onReUp,
  compact = false,
}: Props) {
  const colors = useColors();
  if (lots.length === 0) return null;

  const nextLoss = lots.reduce((soonest, lot) =>
    lot.expiresAt < soonest.expiresAt ? lot : soonest,
  lots[0]!,
  );
  const remainingMs =
    millisecondsRemaining ??
    lots.reduce((sum, lot) => sum + lot.millisecondsRemaining, 0);

  if (compact) {
    return (
      <View style={[styles.compact, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 12 }}>
          🎙️ {totalRemainingDisplay ?? nextLoss.remainingDisplay} left
        </Text>
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 3, lineHeight: 14 }}>
          {nextLoss.loseByLabel}
        </Text>
        <AiTalkLowBalanceNotice compact millisecondsRemaining={remainingMs} onReUp={onReUp} />
      </View>
    );
  }

  return (
    <View style={[styles.box, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}>
      <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>
        {AI_TALK_EXPIRY_TRACKER_HEADLINE}
      </Text>
      <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14, marginTop: 6 }}>
        {totalRemainingVerbose ?? nextLoss.remainingVerbose}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
        Next loss: {nextLoss.loseByLabel}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 10, marginTop: 6, lineHeight: 15 }}>
        {AI_TALK_EXPIRY_PURCHASE_DISCLOSURE}
      </Text>
      <AiTalkLowBalanceNotice millisecondsRemaining={remainingMs} onReUp={onReUp} />

      {lots.map((lot) => (
        <View
          key={lot.id}
          style={[styles.lot, { borderColor: colors.border, backgroundColor: colors.background }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
            {lot.packLabel}
          </Text>
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13, marginTop: 3 }}>
            {lot.remainingVerbose}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 15 }}>
            {lot.loseByLabel}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  compact: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  lot: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
});
