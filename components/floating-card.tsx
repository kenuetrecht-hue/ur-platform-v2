import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { withAlpha } from "@/lib/brand-theme";

type Props = {
  children: ReactNode;
  /** Solid white card, or a dark glass panel on the purple wash. */
  variant?: "solid" | "glass";
  style?: StyleProp<ViewStyle>;
};

/** Main content sits on a rounded card so it separates from the purple wash. */
export function FloatingCard({ children, variant = "solid", style }: Props) {
  const colors = useColors();
  const glass = variant === "glass";

  return (
    <View
      {...(Platform.OS === "web" ? { className: "ur-floating-card" } : null)}
      style={[
        styles.card,
        glass
          ? {
              backgroundColor: withAlpha("#1e1b4b", 0.72),
              borderColor: withAlpha("#ffffff", 0.28),
            }
          : {
              backgroundColor: colors.surface,
              borderColor: withAlpha(colors.primary, 0.14),
            },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowColor: "#1e1b4b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
});
