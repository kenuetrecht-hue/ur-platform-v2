import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "expo-linear-gradient";
import { brandGradientPair } from "@/lib/brand-theme";

interface TabScreenHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

export function TabScreenHeader({ title, subtitle, icon }: TabScreenHeaderProps) {
  const colors = useColors();
  const [gradStart, gradEnd] = brandGradientPair(colors);

  return (
    <View style={styles.wrap}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon ? <Text style={{ fontSize: 28 }}>{icon}</Text> : null}
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
      ) : null}
      <LinearGradient
        colors={[gradStart, gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentLine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  accentLine: {
    height: 3,
    width: 48,
    borderRadius: 2,
    marginTop: 8,
    opacity: 0.85,
  },
});
