import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  brandGradientPair,
  brandSoftGradientPair,
  withAlpha,
} from "@/lib/brand-theme";

type Variant = "soft" | "brand" | "pay";

type BrandGradientProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: Variant;
};

export function BrandGradient({
  children,
  style,
  variant = "soft",
}: BrandGradientProps) {
  const colors = useColors();

  const gradientColors =
    variant === "brand"
      ? brandGradientPair(colors)
      : variant === "pay"
        ? ([withAlpha(colors.primary, 0.16), withAlpha(colors.secondary, 0.1)] as [
            string,
            string,
          ])
        : brandSoftGradientPair(colors);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
