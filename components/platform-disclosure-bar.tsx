import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { BrandGradient } from "@/components/brand-gradient";
import {
  PLATFORM_DISCLOSURE_BOTTOM,
  PLATFORM_DISCLOSURE_FULL,
  PLATFORM_DISCLOSURE_TOP,
} from "@/lib/platform-disclosure-copy";
import { brandDisclosureSurface, withAlpha } from "@/lib/brand-theme";

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
      style={[styles.text, { color: withAlpha(colors.muted, 0.92) }]}
      numberOfLines={compact ? 2 : 4}
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
          ? { paddingTop: insets.top + 4, paddingBottom: 5 }
          : aboveTabBar
            ? { paddingTop: 6, paddingBottom: 4 }
            : { paddingTop: 5, paddingBottom: insets.bottom + 4 },
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
    paddingHorizontal: 14,
  },
  barTop: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barBottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 14,
    textAlign: "center",
    letterSpacing: 0.12,
    opacity: 0.78,
  },
});
