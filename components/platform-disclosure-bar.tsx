import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  PLATFORM_DISCLOSURE_BOTTOM,
  PLATFORM_DISCLOSURE_FULL,
  PLATFORM_DISCLOSURE_TOP,
} from "@/lib/platform-disclosure-copy";
import { LETTERING_ON_WHITE } from "@/lib/gold-lettering";

export function PlatformDisclosureBar({
  position,
  compact = true,
  onPressFull,
  /** When true, sits directly above the tab bar — tab bar owns the home-indicator inset. */
  aboveTabBar = false,
}: {
  position: "top" | "bottom";
  compact?: boolean;
  onPressFull?: () => void;
  aboveTabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();

  const text =
    position === "top"
      ? PLATFORM_DISCLOSURE_TOP
      : compact
        ? PLATFORM_DISCLOSURE_BOTTOM
        : PLATFORM_DISCLOSURE_FULL;

  const content = (
    <Text
      style={[styles.text, aboveTabBar ? styles.textAboveTab : null, { color: LETTERING_ON_WHITE }]}
      numberOfLines={compact ? 1 : 3}
    >
      {text}
    </Text>
  );

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: "#FFFFFF", borderColor: "#E0E7FF" },
        position === "top" ? styles.barTop : styles.barBottom,
        position === "top"
          ? { paddingTop: insets.top + 2, paddingBottom: 2 }
          : aboveTabBar
            ? { paddingTop: 1, paddingBottom: 1 }
            : { paddingTop: 3, paddingBottom: insets.bottom + 2 },
      ]}
    >
      <View accessibilityRole="text" accessibilityLabel={text}>
        {onPressFull ? (
          <Pressable onPress={onPressFull}>{content}</Pressable>
        ) : (
          content
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 10,
  },
  barTop: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barBottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 8,
    fontWeight: "400",
    lineHeight: 11,
    textAlign: "center",
    letterSpacing: 0.08,
  },
  textAboveTab: {
    fontSize: 7,
    lineHeight: 9,
  },
});
