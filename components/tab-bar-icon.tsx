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
  | "bubble.right.fill"
  | "shield.fill";

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
        width: 36,
        height: 22,
        borderRadius: 11,
        ...(focused ? active : null),
      }}
    >
      <IconSymbol
        name={name as ComponentProps<typeof IconSymbol>["name"]}
        size={18}
        color={focused ? colors.primary : colors.muted}
      />
    </View>
  );
}

export type { TabIconName };
