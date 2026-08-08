import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { usePlatformSection } from "@/hooks/use-platform-section";
import type { PlatformSectionId } from "@/lib/platform-section-flags";

type Props = {
  sectionId: PlatformSectionId;
  children: React.ReactNode;
};

/** Blocks a screen when its platform section is in maintenance mode. */
export function PlatformSectionGate({ sectionId, children }: Props) {
  const colors = useColors();
  const section = usePlatformSection(sectionId);

  if (section.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!section.enabled) {
    return (
      <View style={[styles.box, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>🔧 Temporarily offline</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          {section.maintenanceMessage ||
            "This area is under maintenance. The rest of UR is still available."}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  box: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  title: { fontSize: 17, fontWeight: "800" },
  body: { fontSize: 13, lineHeight: 19 },
});
