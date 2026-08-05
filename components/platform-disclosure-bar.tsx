import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  PLATFORM_DISCLOSURE_FULL,
  PLATFORM_DISCLOSURE_SHORT,
} from "@/lib/platform-disclosure-copy";

export function PlatformDisclosureBar({
  position,
  compact = false,
  onPressFull,
}: {
  position: "top" | "bottom";
  compact?: boolean;
  onPressFull?: () => void;
}) {
  const text = compact ? PLATFORM_DISCLOSURE_SHORT : PLATFORM_DISCLOSURE_FULL;

  return (
    <View
      style={[
        styles.bar,
        position === "top" ? styles.barTop : styles.barBottom,
      ]}
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      <Pressable onPress={onPressFull} disabled={!onPressFull}>
        <Text style={styles.text} numberOfLines={compact ? 2 : 4}>
          {position === "top" ? "⬆ " : "⬇ "}
          {text}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "#FACC15",
    borderColor: "#CA8A04",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  barTop: {
    borderBottomWidth: 2,
  },
  barBottom: {
    borderTopWidth: 2,
  },
  text: {
    color: "#000",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    textAlign: "center",
  },
});
