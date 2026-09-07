import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "expo-linear-gradient";
import { brandGradientPair } from "@/lib/brand-theme";

interface TabScreenHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  /** Tighter spacing for dense tab screens (e.g. AIs chat). */
  compact?: boolean;
}

export function TabScreenHeader({ title, subtitle, icon, compact = false }: TabScreenHeaderProps) {
  const colors = useColors();
  const [gradStart, gradEnd] = brandGradientPair(colors);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon ? <Text style={{ fontSize: compact ? 22 : 28 }}>{icon}</Text> : null}
        <Text style={[styles.title, compact && styles.titleCompact, { color: colors.foreground }]}>
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, compact && styles.subtitleCompact, { color: colors.muted }]}>
          {subtitle}
        </Text>
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
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 4,
  },
  wrapCompact: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  titleCompact: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  accentLine: {
    height: 3,
    width: 64,
    borderRadius: 2,
    marginTop: 8,
    opacity: 0.9,
  },
});
