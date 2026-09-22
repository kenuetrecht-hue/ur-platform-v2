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
        width: 28,
        height: 16,
        borderRadius: 8,
        ...(focused ? active : null),
      }}
    >
      <IconSymbol
        name={name as ComponentProps<typeof IconSymbol>["name"]}
        size={14}
        color={colors.onWhite}
      />
    </View>
  );
}

export type { TabIconName };
