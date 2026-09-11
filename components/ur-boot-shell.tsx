import { ActivityIndicator, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

/** Branded wait screen — website and phone app share this instead of a bare spinner. */
export function UrBootShell({ label = "Opening UR…" }: { label?: string }) {
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
        gap: 14,
        padding: 24,
      }}
      testID="ur-boot-shell"
    >
      <Text style={{ color: colors.primary, fontSize: 40, fontWeight: "900", letterSpacing: 3 }}>
        UR
      </Text>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "700", textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}
