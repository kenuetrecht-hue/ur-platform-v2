import { ScrollView, Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";

type TabItem = {
  id: string;
  label: string;
  emoji?: string;
};

type AiHubTabRowProps = {
  tabs: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  accentColor?: string;
  style?: ViewStyle;
};

export function AiHubTabRow({
  tabs,
  activeId,
  onSelect,
  accentColor,
  style,
}: AiHubTabRowProps) {
  const colors = useColors();
  const activeBg = accentColor ?? colors.primary;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={[styles.row, style]}
      keyboardShouldPersistTaps="handled"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const labelColor = active ? "#FFFFFF" : colors.foreground;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelect(tab.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? activeBg : colors.surface,
                borderColor: active ? activeBg : colors.border,
              },
            ]}
          >
            {tab.emoji ? <Text style={styles.chipEmoji}>{tab.emoji}</Text> : null}
            <Text style={[styles.chipText, { color: labelColor }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 76,
    maxHeight: 88,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chip: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  chipEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
    textAlign: "center",
  },
});
