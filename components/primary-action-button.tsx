import React from "react";
import {
  Platform,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

type PrimaryActionButtonProps = {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  onPress: () => void | Promise<void>;
  backgroundColor: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
} & Pick<PressableProps, "testID">;

/**
 * Primary CTA — Pressable with web pointer/cursor fixes (HTML buttons break inside RN Web trees).
 */
export function PrimaryActionButton({
  label,
  loadingLabel = "Loading...",
  loading = false,
  onPress,
  backgroundColor,
  textColor = "#fff",
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: PrimaryActionButtonProps) {
  const displayLabel = loading ? loadingLabel : label;

  const runPress = () => {
    if (loading) return;
    void onPress();
  };

  return (
    <Pressable
      onPress={runPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [
        {
          backgroundColor,
          borderRadius: 12,
          padding: 16,
          alignItems: "center",
          opacity: loading ? 0.6 : pressed ? 0.9 : 1,
          zIndex: 10,
          ...(Platform.OS === "web"
            ? ({ cursor: loading ? "default" : "pointer", userSelect: "none" } as object)
            : null),
        },
        style,
      ]}
    >
      <Text
        style={[{ fontSize: 16, fontWeight: "600", color: textColor }, textStyle]}
        pointerEvents="none"
      >
        {displayLabel}
      </Text>
    </Pressable>
  );
}
