import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";

type ComposerDockProps = {
  children: ReactNode;
  paddingBottom?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Floating compose card — keeps the message bar above the tab / legal strip
 * instead of stretching flush into the footer.
 */
export function ComposerDock({ children, paddingBottom = 8, style }: ComposerDockProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.dock,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          paddingBottom,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexShrink: 0,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    zIndex: 2,
  },
});
