import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { withAlpha } from "@/lib/brand-theme";

/** Native / fallback backdrop — soft gradient pulse field. */
export function TechnoFuturistCanvas() {
  const colors = useColors();
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <LinearGradient
        colors={[colors.background, withAlpha(colors.primary, 0.12), colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["transparent", withAlpha(colors.secondary, 0.08), "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.9 }]}
      />
    </View>
  );
}
