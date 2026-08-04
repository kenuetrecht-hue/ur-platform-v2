import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import type { ComponentProps } from "react";

type TabIconName =
  | "house.fill"
  | "pencil.circle.fill"
  | "compass.fill"
  | "bubble.right.fill"
  | "person.fill";

interface TabBarIconProps {
  name: TabIconName;
  focused: boolean;
}

export function TabBarIcon({ name, focused }: TabBarIconProps) {
  const colors = useColors();

  return (
    <IconSymbol
      name={name as ComponentProps<typeof IconSymbol>["name"]}
      size={24}
      color={focused ? colors.primary : colors.muted}
    />
  );
}

export type { TabIconName };
