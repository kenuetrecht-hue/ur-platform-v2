import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { US_STATE_LIST, type UsStateCode } from "@/lib/us-state-taxes";

type Props = {
  value: UsStateCode | null;
  onChange: (code: UsStateCode) => void;
};

export function BillingStatePicker({ value, onChange }: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const selectedName = useMemo(
    () => US_STATE_LIST.find((s) => s.code === value)?.name ?? null,
    [value],
  );

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
        Billing state (taxes & fees)
      </Text>
      <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4, lineHeight: 14 }}>
        Sales tax and state fees are calculated for your state before you pay.
      </Text>

      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Text style={{ color: value ? colors.foreground : colors.muted, fontSize: 13, flex: 1 }}>
          {selectedName ? `${selectedName} (${value})` : "Select your state"}
        </Text>
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
          {expanded ? "Hide" : "Change"}
        </Text>
      </Pressable>

      {expanded ? (
        <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {US_STATE_LIST.map((state) => {
            const active = value === state.code;
            return (
              <Pressable
                key={state.code}
                onPress={() => {
                  onChange(state.code);
                  setExpanded(false);
                }}
                style={[
                  styles.option,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? `${colors.primary}12` : colors.surface,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontWeight: active ? "700" : "500", fontSize: 12 }}>
                  {state.name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{state.code}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  selector: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  list: {
    maxHeight: 180,
    marginTop: 8,
  },
  option: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
