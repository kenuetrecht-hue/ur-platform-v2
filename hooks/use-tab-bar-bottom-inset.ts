import { useSafeAreaInsets } from "react-native-safe-area-context";
import { effectiveTabBarBottomInset } from "@/lib/layout-overlap";

/** Real home-indicator inset only — never a fake extra phone toolbar. */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  return effectiveTabBarBottomInset(insets.bottom);
}
