import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandColorStage } from "@/components/brand-color-stage";
import { LANDING_THEME as T } from "@/lib/landing-theme";

/** Blue-to-purple stage shared by Login and Sign up so both doors match the website. */
export function AuthDoorStage({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root} testID="auth-door-stage">
      <BrandColorStage />
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
});
