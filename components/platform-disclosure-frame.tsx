import { View, StyleSheet } from "react-native";
import { useSegments } from "expo-router";
import { PlatformDisclosureBar } from "@/components/platform-disclosure-bar";

/**
 * Global shell: top disclosure on every screen.
 * Bottom legal disclaimer on tab screens lives in TabBarWithDisclosure (above tabs).
 * Bottom disclaimer on auth / stack-only screens is rendered here.
 */
export function PlatformDisclosureFrame({
  children,
  compact = true,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  const segments = useSegments();
  const inTabs = segments[0] === "(tabs)";
  // Marketing landing is full-bleed dark UI — global disclosure bars clash and steal vertical space.
  const isMarketingLanding = segments[0] === "welcome";
  const isAuthScreen =
    segments[0] === "(auth)" || segments[0] === "login" || segments[0] === "signup";

  if (isMarketingLanding || isAuthScreen) {
    return <View style={styles.root}>{children}</View>;
  }

  return (
    <View style={styles.root}>
      <PlatformDisclosureBar position="top" compact={compact} />
      <View style={styles.content}>{children}</View>
      {!inTabs ? <PlatformDisclosureBar position="bottom" compact={compact} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, minHeight: 0 },
});
