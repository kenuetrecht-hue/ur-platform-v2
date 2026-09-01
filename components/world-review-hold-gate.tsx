import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { TERMS_SUPPORT_EMAIL } from "@/lib/platform-terms-of-use";

/** Shown when World Director has paused the member for owner review. */
export function WorldReviewHoldGate(props: {
  memberWarning: string;
  status: "paused_review" | "discontinued" | string;
}) {
  const colors = useColors();
  const discontinued = props.status === "discontinued";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.flag, { color: "#ef4444" }]}>
          {discontinued ? "Account discontinued" : "Account paused for review"}
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          World Director AI has flagged this account
        </Text>
        <Text style={[styles.body, { color: colors.foreground }]}>{props.memberWarning}</Text>
        <Text style={[styles.sub, { color: colors.muted }]}>
          The platform owner will look at the English copy of what was sent. After that review your
          account is either reactivated or discontinued. Money invested is forfeited if the account
          is discontinued. No refunds.
        </Text>
        <Text style={[styles.sub, { color: colors.muted }]}>Questions: {TERMS_SUPPORT_EMAIL}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40, gap: 12 },
  flag: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: "900" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  sub: { fontSize: 13, lineHeight: 20 },
});
