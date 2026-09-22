import type { ReactNode } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { AppPressable } from "@/components/app-pressable";
import { withAlpha } from "@/lib/brand-theme";

type Props = {
  emoji: string;
  label: string;
  onPress: () => void;
  testID?: string;
};

/** Social-style door — name only. The page you open explains itself. */
export function HubDoorTile({ emoji, label, onPress, testID }: Props) {
  const colors = useColors();

  return (
    <AppPressable
      onPress={onPress}
      testID={testID}
      style={[
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: withAlpha(colors.primary, 0.42),
        },
      ]}
    >
      <Text pointerEvents="none" style={styles.emoji}>
        {emoji}
      </Text>
      <Text pointerEvents="none" style={[styles.label, { color: colors.onWhite }]} numberOfLines={2}>
        {label}
      </Text>
    </AppPressable>
  );
}

export function HubDoorGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "47%",
    flexGrow: 1,
    flexBasis: "46%",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 8,
    minHeight: 88,
    justifyContent: "center",
  },
  emoji: {
    fontSize: 26,
    lineHeight: 30,
  },
  label: {
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  },
});
