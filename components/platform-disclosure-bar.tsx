import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { BrandGradient } from "@/components/brand-gradient";
import {
  PLATFORM_DISCLOSURE_BOTTOM,
  PLATFORM_DISCLOSURE_FULL,
  PLATFORM_DISCLOSURE_TOP,
} from "@/lib/platform-disclosure-copy";
import { brandDisclosureSurface } from "@/lib/brand-theme";

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
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const brand = brandDisclosureSurface(colors);

  const text =
    position === "top"
      ? PLATFORM_DISCLOSURE_TOP
      : compact
        ? PLATFORM_DISCLOSURE_BOTTOM
        : PLATFORM_DISCLOSURE_FULL;

  const content = (
    <Text
      style={[styles.text, { color: colors.gold }]}
      numberOfLines={compact ? 1 : 3}
    >
      {text}
    </Text>
  );

  return (
    <BrandGradient
      variant="soft"
      style={[
        styles.bar,
        brand,
        position === "top" ? styles.barTop : styles.barBottom,
        position === "top"
          ? { paddingTop: insets.top + 2, paddingBottom: 2 }
          : aboveTabBar
            ? { paddingTop: 2, paddingBottom: 2 }
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
    </BrandGradient>
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
    opacity: 0.78,
  },
});
