import { ScrollView, Text, StyleSheet, ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { AppPressable } from "@/components/app-pressable";
import { LETTERING_ON_WHITE } from "@/lib/gold-lettering";

type AiSpecialistPickerProps = {
  specialists: AiCreatorCatalogEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  style?: ViewStyle;
};

export function AiSpecialistPicker({
  specialists,
  selectedId,
  onSelect,
  style,
}: AiSpecialistPickerProps) {
  const colors = useColors();

  if (specialists.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={[styles.row, style]}
      keyboardShouldPersistTaps="handled"
    >
      {specialists.map((specialist) => {
        const active = specialist.id === selectedId;
        const nameColor = active ? "#FFFFFF" : LETTERING_ON_WHITE;
        const categoryColor = active ? "rgba(255,255,255,0.92)" : "#6D28D9";

        return (
          <AppPressable
            key={specialist.id}
            testID={`ai-specialist-${specialist.id}`}
            onPress={() => onSelect(specialist.id)}
            style={[
              styles.card,
              {
                backgroundColor: active ? colors.primary : "#FFFFFF",
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text pointerEvents="none" style={styles.avatar}>
              {specialist.avatar}
            </Text>
            <Text pointerEvents="none" style={[styles.name, { color: nameColor }]}>
              {specialist.name}
            </Text>
            <Text pointerEvents="none" style={[styles.category, { color: categoryColor }]}>
              {specialist.category}
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
    minHeight: 132,
    maxHeight: 148,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  card: {
    flexShrink: 0,
    width: 136,
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
  },
  avatar: {
    fontSize: 28,
    lineHeight: 32,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 17,
    width: "100%",
  },
  category: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
    width: "100%",
  },
});
