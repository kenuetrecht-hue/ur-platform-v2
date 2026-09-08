import { View, Text, Pressable, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { PURCHASE_NO_REFUND_CHECKBOX_LABEL } from "@/lib/platform-terms-of-use";
import type { DigitalPurchaseAgreement } from "@/lib/digital-purchase-agreements";

/** Required check before a digital package purchase. Server timestamps the same check. */
export function NoRefundPurchaseAck({
  checked,
  onToggle,
  label,
  title,
  rules,
  agreement,
}: {
  checked: boolean;
  onToggle: () => void;
  label?: string;
  title?: string;
  rules?: string[];
  agreement?: DigitalPurchaseAgreement;
}) {
  const colors = useColors();
  const heading = title ?? agreement?.title;
  const lines = rules ?? agreement?.rules ?? [];
  const checkboxLabel = label ?? agreement?.checkboxLabel ?? PURCHASE_NO_REFUND_CHECKBOX_LABEL;

  return (
    <View style={styles.wrap}>
      {heading || lines.length > 0 ? (
        <View style={[styles.rulesBox, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}>
          {heading ? (
            <Text style={[styles.rulesTitle, { color: colors.foreground }]}>{heading}</Text>
          ) : null}
          {lines.map((line) => (
            <Text key={line} style={[styles.rule, { color: colors.foreground }]}>
              • {line}
            </Text>
          ))}
        </View>
      ) : null}
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
        <Text style={[styles.label, { color: colors.foreground }]}>{checkboxLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10 },
  rulesBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  rulesTitle: { fontSize: 13, fontWeight: "800", marginBottom: 6 },
  rule: { fontSize: 11, lineHeight: 16, fontWeight: "600", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
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
