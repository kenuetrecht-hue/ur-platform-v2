import { View, StyleSheet } from "react-native";
import { PlatformDisclosureBar } from "@/components/platform-disclosure-bar";

/** Top + bottom disclosure on every user, creator, and AI page. */
export function PlatformDisclosureFrame({
  children,
  compact = true,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={styles.root}>
      <PlatformDisclosureBar position="top" compact={compact} />
      <View style={styles.content}>{children}</View>
      <PlatformDisclosureBar position="bottom" compact={compact} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, minHeight: 0 },
});
