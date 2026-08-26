import { Pressable, Text, View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  AI_TALK_LOW_BALANCE_HEADLINE,
  getTalkLowBalanceNotice,
} from "@/lib/ai-talk-time-policy";

type Props = {
  millisecondsRemaining: number;
  onReUp?: () => void;
  compact?: boolean;
};

export function AiTalkLowBalanceNotice({
  millisecondsRemaining,
  onReUp,
  compact = false,
}: Props) {
  const colors = useColors();
  const notice = getTalkLowBalanceNotice(millisecondsRemaining);
  if (!notice) return null;

  return (
    <View
      style={[
        compact ? styles.compact : styles.box,
        { borderColor: "#c47b17", backgroundColor: "#c47b1718" },
      ]}
    >
      <Text style={{ color: "#c47b17", fontWeight: "800", fontSize: compact ? 11 : 12 }}>
        {AI_TALK_LOW_BALANCE_HEADLINE}
      </Text>
      <Text style={{ color: colors.foreground, fontSize: compact ? 10 : 11, marginTop: 4, lineHeight: 15 }}>
        {notice}
      </Text>
      {onReUp ? (
        <Pressable
          onPress={onReUp}
          style={[styles.cta, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Re-up talk time</Text>
        </Pressable>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4, lineHeight: 14 }}>
          Open AI Talk Time below to add another pack before this one runs out.
        </Text>
      )}
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
    marginTop: 6,
  },
  cta: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
});
