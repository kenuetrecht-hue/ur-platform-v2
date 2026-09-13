import { type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { LANDING_THEME as T } from "@/lib/landing-theme";

/** Blue-to-purple stage shared by Login and Sign up so both doors match the website. */
export function AuthDoorStage({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root} testID="auth-door-stage">
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
      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
    overflow: "hidden",
  },
  safe: {
    flex: 1,
  },
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
