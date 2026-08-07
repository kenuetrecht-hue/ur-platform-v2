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
