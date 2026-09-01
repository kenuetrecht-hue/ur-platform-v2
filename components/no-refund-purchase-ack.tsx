import { View, Text, Pressable, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { PURCHASE_NO_REFUND_CHECKBOX_LABEL } from "@/lib/platform-terms-of-use";

/** Required check before a digital package purchase. Server timestamps the same check. */
export function NoRefundPurchaseAck({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onToggle} style={styles.row} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : "transparent",
          },
        ]}
      >
        {checked ? <Text style={styles.mark}>✓</Text> : null}
      </View>
      <Text style={[styles.label, { color: colors.foreground }]}>{PURCHASE_NO_REFUND_CHECKBOX_LABEL}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 10 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  mark: { color: "#fff", fontSize: 14, fontWeight: "800" },
  label: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600" },
});
