import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import {
  CREATOR_CONTENT_PROTECTION_NOTICE,
  CREATOR_IMPERSONATION_REPORT_HINT,
} from "@/lib/creator-content-protection-copy";

/** Creator dashboard — content protection status & policy (web + app). */
export function CreatorContentProtectionPanel() {
  const colors = useColors();
  const status = trpc.contentProtection.myStatus.useQuery();

  const strikes = status.data?.strikes.strikeCount ?? 0;
  const canPublish = status.data?.canPublish ?? true;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ fontSize: 22 }}>🛡️</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Content protection</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{CREATOR_CONTENT_PROTECTION_NOTICE}</Text>

      <View style={[styles.statusRow, { borderColor: colors.border }]}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Publishing</Text>
        <Text style={{ color: canPublish ? "#22c55e" : colors.error ?? "#ef4444", fontWeight: "800" }}>
          {canPublish ? "Active" : "Paused — contact support"}
        </Text>
      </View>
      <View style={[styles.statusRow, { borderColor: colors.border }]}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Strikes</Text>
        <Text style={{ color: colors.foreground, fontWeight: "800" }}>{strikes} / 3</Text>
      </View>

      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 8 }}>
        {CREATOR_IMPERSONATION_REPORT_HINT}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 6 }}>
        To repost public content: use Licensed repost in the Social feed, credit the source, and pick your license type.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  title: { fontSize: 16, fontWeight: "800" },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 4,
  },
});
