import { forwardRef } from "react";
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";

/**
 * Pressable that actually receives clicks on React Native Web.
 * HTML cursor + user-select, and Text children should set pointerEvents="none".
 * Forwards ref so expo-router <Link asChild> works.
 */
export const AppPressable = forwardRef<View, PressableProps>(function AppPressable(
  { style, disabled, ...props },
  ref,
) {
  const webPointer =
    Platform.OS === "web"
      ? ({ cursor: disabled ? "default" : "pointer", userSelect: "none" } as ViewStyle)
      : null;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      disabled={disabled}
      {...props}
      style={(state) => {
        const resolved =
          typeof style === "function" ? style(state) : (style as StyleProp<ViewStyle>);
        return [webPointer, resolved];
      }}
    />
  );
});
