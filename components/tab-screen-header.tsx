import { View, Text } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface TabScreenHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

export function TabScreenHeader({ title, subtitle, icon }: TabScreenHeaderProps) {
  const colors = useColors();

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon ? <Text style={{ fontSize: 28 }}>{icon}</Text> : null}
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: colors.foreground,
          }}
        >
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text style={{ fontSize: 15, color: colors.muted, lineHeight: 22 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
