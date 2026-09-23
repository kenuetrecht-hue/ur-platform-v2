import { ScrollView, Text, StyleSheet, ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { AppPressable } from "@/components/app-pressable";
import { withAlpha } from "@/lib/brand-theme";

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
        const labelColor = colors.gold;
        return (
          <AppPressable
            key={tab.id}
            testID={`ai-hub-tab-${tab.id}`}
            onPress={() => onSelect(tab.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? withAlpha(colors.gold, 0.22) : withAlpha("#ffffff", 0.08),
                borderColor: active ? (accentColor ?? colors.gold) : withAlpha(colors.gold, 0.35),
              },
            ]}
          >
            {tab.emoji ? (
              <Text pointerEvents="none" style={styles.chipEmoji}>
                {tab.emoji}
              </Text>
            ) : null}
            <Text pointerEvents="none" style={[styles.chipText, { color: labelColor }]}>
              {tab.label}
            </Text>
          </AppPressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  chipEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
    textAlign: "center",
  },
});
