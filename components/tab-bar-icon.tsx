import { View } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { brandTabActiveSurface } from "@/lib/brand-theme";
import type { ComponentProps } from "react";

type TabIconName =
  | "house.fill"
  | "sparkles"
  | "person.fill"
  | "pencil.circle.fill"
  | "compass.fill"
  | "bubble.right.fill";

interface TabBarIconProps {
  name: TabIconName;
  focused: boolean;
}

export function TabBarIcon({ name, focused }: TabBarIconProps) {
  const colors = useColors();
  const active = brandTabActiveSurface(colors);

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 30,
        borderRadius: 15,
        ...(focused ? active : null),
      }}
    >
      <IconSymbol
        name={name as ComponentProps<typeof IconSymbol>["name"]}
        size={22}
        color={focused ? colors.primary : colors.muted}
      />
    </View>
  );
}

export type { TabIconName };
