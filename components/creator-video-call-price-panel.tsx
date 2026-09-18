import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import {
  CREATOR_VIDEO_CALL_PRICE_HINT,
  CREATOR_VIDEO_CALL_SPLIT_NOTE,
  dollarsToCallPriceCents,
  formatCallPriceCents,
} from "@/lib/creator-call-pricing";

export function CreatorVideoCallPricePanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const dash = trpc.partnerDashboard.creatorDashboard.useQuery();
  const save = trpc.partnerDashboard.setVideoCallPrice.useMutation({
    onSuccess: () => {
      setNotice("Saved. Callers will see this price on Social and on your posts.");
      void utils.partnerDashboard.creatorDashboard.invalidate();
    },
    onError: (e) => setNotice(e.message),
  });
  const current = dash.data && dash.data.enrolled ? dash.data.profile.videoCallPriceCents : null;
  const [raw, setRaw] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  if (!dash.data?.enrolled) return null;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 14 }}>
        1-to-1 video call price
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {CREATOR_VIDEO_CALL_SPLIT_NOTE} {CREATOR_VIDEO_CALL_PRICE_HINT}
      </Text>
      {current != null ? (
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
          Current price: {formatCallPriceCents(current)}
        </Text>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          No price yet — callers cannot book you until you set one.
        </Text>
      )}
      <TextInput
        value={raw}
        onChangeText={setRaw}
        placeholder="e.g. 1 or 25 or 5000"
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        maxLength={8}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />
      <Pressable
        onPress={() => {
          const cents = dollarsToCallPriceCents(raw);
          if (cents == null) {
            setNotice("Type a dollar amount from 1 to 5000.");
            return;
          }
          save.mutate({ priceCents: cents });
        }}
        style={[styles.btn, { backgroundColor: colors.primary }]}
      >
        {save.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Save call price</Text>
        )}
      </Pressable>
      {notice ? <Text style={{ color: colors.muted, fontSize: 12 }}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  btn: { borderRadius: 10, padding: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});
