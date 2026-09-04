import type { ReactNode } from "react";
import { Platform, Pressable, type StyleProp, type ViewStyle } from "react-native";

/**
 * Icon/tool buttons that actually receive clicks on web.
 * RN Pressable is often swallowed by nested ScrollViews and a WebGL canvas stacked on top.
 */
export function WorkspaceTapButton({
  onPress,
  disabled,
  children,
  style,
}: {
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const fire = () => {
    if (disabled) return;
    onPress();
  };

  if (Platform.OS === "web") {
    return (
      // @ts-expect-error native web button — canvas/scroll steal RN onPress
      <button
        type="button"
        disabled={disabled}
        onClick={(e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          fire();
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: disabled ? "default" : "pointer",
          font: "inherit",
        }}
      >
        <Pressable pointerEvents="none" style={style}>
          {children}
        </Pressable>
      </button>
    );
  }

  return (
    <Pressable onPress={fire} disabled={disabled} style={style}>
      {children}
    </Pressable>
  );
}
