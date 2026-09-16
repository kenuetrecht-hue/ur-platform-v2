import { Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LANDING_THEME as T } from "@/lib/landing-theme";

/** Same blue-to-purple wash as Login, behind every page. */
export function BrandColorStage() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="brand-color-stage">
      <LinearGradient
        colors={[T.brandBlue, "#2a1266", T.brandPurple, T.bg]}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbBlue]} />
      <View style={[styles.orb, styles.orbPurple]} />
      <View style={[styles.orb, styles.orbCyan]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    borderRadius: 999,
    ...(Platform.OS === "web"
      ? ({ filter: "blur(40px)" } as object)
      : { opacity: 0.55 }),
  },
  orbBlue: {
    width: 280,
    height: 280,
    top: -90,
    right: -70,
    backgroundColor: "rgba(79, 70, 229, 0.7)",
  },
  orbPurple: {
    width: 320,
    height: 320,
    bottom: -120,
    left: -90,
    backgroundColor: "rgba(124, 58, 237, 0.65)",
  },
  orbCyan: {
    width: 180,
    height: 180,
    top: "42%",
    left: "58%",
    backgroundColor: "rgba(0, 212, 255, 0.28)",
  },
});
