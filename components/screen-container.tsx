import { View, type ViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";
import { BrandColorStage } from "@/components/brand-color-stage";
import { LANDING_THEME as T } from "@/lib/landing-theme";

function withoutPageFill(className?: string) {
  if (!className) return undefined;
  const next = className
    .split(/\s+/)
    .filter((token) => token && token !== "bg-background")
    .join(" ");
  return next || undefined;
}

export interface ScreenContainerProps extends ViewProps {
  /**
   * SafeArea edges to apply. Defaults to ["left", "right"] — top is handled by
   * PlatformDisclosureFrame; bottom on tab screens is handled by TabBarWithDisclosure.
   */
  edges?: Edge[];
  /**
   * Tailwind className for the content area.
   */
  className?: string;
  /**
   * Additional className for the outer container (background layer).
   */
  containerClassName?: string;
  /**
   * Additional className for the SafeAreaView (content layer).
   */
  safeAreaClassName?: string;
}

/**
 * A container component that properly handles SafeArea and background colors.
 *
 * The outer View extends to full screen (including status bar area) with the login
 * blue-to-purple wash, while the inner SafeAreaView keeps content in safe bounds.
 */
export function ScreenContainer({
  children,
  edges = ["left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  style,
  ...props
}: ScreenContainerProps) {
  return (
    <View
      className={cn("flex-1", containerClassName)}
      style={{ flex: 1, minHeight: 0, overflow: "hidden", backgroundColor: T.bg }}
      {...props}
    >
      <BrandColorStage />
      <SafeAreaView
        edges={edges}
        className={cn("flex-1", withoutPageFill(safeAreaClassName))}
        style={[{ flex: 1, minHeight: 0, backgroundColor: "transparent" }, style]}
      >
        <View
          style={{ flex: 1, minHeight: 0, backgroundColor: "transparent" }}
          className={cn("flex-1", withoutPageFill(className))}
        >
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}
