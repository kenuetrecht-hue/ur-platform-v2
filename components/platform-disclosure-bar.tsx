import { View, Text, Pressable, StyleSheet } from "react-native";
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
}: {
  position: "top" | "bottom";
  compact?: boolean;
  onPressFull?: () => void;
}) {
  const colors = useColors();
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
    paddingVertical: 5,
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
